import type { EventCategory } from "@/lib/types";
import { clamp } from "@/lib/utils";

export type CustomEventSuggestion = {
  id: string;
  title: string;
  category: EventCategory;
  probability: number;
  confidence: number;
  source: string;
  sourceUrl: string;
  lastUpdatedAt: string;
  resolutionSource: string;
  reason: string;
};

type WeatherGeo = {
  results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }>;
};

type WeatherForecast = {
  daily?: {
    temperature_2m_max?: number[];
    precipitation_sum?: number[];
  };
};

type CoinGeckoPrice = Record<string, { usd?: number; usd_24h_change?: number }>;

type GdeltTimeline = {
  timeline?: Array<{ date?: string; value?: number }>;
};

const CRYPTO_ALIASES = [
  { keys: ["bitcoin", "btc"], id: "bitcoin", label: "Bitcoin", symbol: "BTC" },
  { keys: ["ethereum", "eth"], id: "ethereum", label: "Ethereum", symbol: "ETH" },
  { keys: ["solana", "sol"], id: "solana", label: "Solana", symbol: "SOL" },
  { keys: ["dogecoin", "doge"], id: "dogecoin", label: "Dogecoin", symbol: "DOGE" },
];

const WEATHER_CITIES = [
  "Phoenix",
  "New York",
  "Miami",
  "Seattle",
  "Chicago",
  "Dallas",
  "Denver",
  "Los Angeles",
  "San Francisco",
  "Boston",
  "Atlanta",
  "Las Vegas",
];

const STOCK_SYMBOLS = new Map([
  ["nvidia", "NVDA"],
  ["nvda", "NVDA"],
  ["tesla", "TSLA"],
  ["tsla", "TSLA"],
  ["apple", "AAPL"],
  ["aapl", "AAPL"],
  ["microsoft", "MSFT"],
  ["msft", "MSFT"],
  ["amazon", "AMZN"],
  ["amzn", "AMZN"],
  ["meta", "META"],
  ["googl", "GOOGL"],
  ["google", "GOOGL"],
  ["coinbase", "COIN"],
  ["coin", "COIN"],
  ["spy", "SPY"],
  ["qqq", "QQQ"],
]);

export async function buildCustomEventSuggestions(query: string) {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const [crypto, weather, stock, news, sports] = await Promise.all([
    cryptoSuggestion(clean),
    weatherSuggestion(clean),
    stockSuggestion(clean),
    newsMomentumSuggestion(clean),
    sportsSuggestion(clean),
  ]);

  return [crypto, weather, stock, news, sports].filter(Boolean) as CustomEventSuggestion[];
}

async function cryptoSuggestion(query: string): Promise<CustomEventSuggestion | null> {
  const lower = query.toLowerCase();
  const match = CRYPTO_ALIASES.find((item) => item.keys.some((key) => lower.includes(key)));
  if (!match) return null;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd&include_24hr_change=true`;
  const json = await safeJson<CoinGeckoPrice>(url);
  const price = json?.[match.id]?.usd;
  if (!price) return null;

  const change = json?.[match.id]?.usd_24h_change ?? 0;
  const threshold = niceThreshold(price * (change >= 0 ? 1.08 : 1.04));
  const probability = clamp(44 + change * 1.8, 18, 82);

  return suggestion({
    title: `Will ${match.label} trade above $${formatThreshold(threshold)} in the next 14 days?`,
    category: "crypto",
    probability,
    confidence: 68,
    source: "CoinGecko live spot price",
    sourceUrl: url,
    resolutionSource: "CoinGecko USD market data",
    reason: `${match.symbol} is trading near $${formatThreshold(price)} with a ${change.toFixed(1)}% 24h move, so Scout creates a threshold slightly above spot.`,
  });
}

async function weatherSuggestion(query: string): Promise<CustomEventSuggestion | null> {
  const lower = query.toLowerCase();
  const city = WEATHER_CITIES.find((item) => lower.includes(item.toLowerCase())) ?? weatherCityFromQuery(query);
  if (!city && !/(rain|snow|temperature|weather|hot|cold|storm|wind)/i.test(query)) return null;

  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city ?? query)}&count=1&language=en&format=json`;
  const geo = await safeJson<WeatherGeo>(geocodeUrl);
  const place = geo?.results?.[0];
  if (!place) return null;

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,precipitation_sum&temperature_unit=fahrenheit&forecast_days=7`;
  const forecast = await safeJson<WeatherForecast>(forecastUrl);
  const maxTemp = Math.max(...(forecast?.daily?.temperature_2m_max ?? [80]));
  const rain = (forecast?.daily?.precipitation_sum ?? []).reduce((sum, value) => sum + value, 0);
  const isRainQuery = /(rain|storm|precipitation)/i.test(query);

  if (isRainQuery) {
    return suggestion({
      title: `Will ${place.name} receive more than 1 inch of rain in the next 7 days?`,
      category: "weather",
      probability: clamp(28 + rain * 12, 10, 86),
      confidence: 70,
      source: "Open-Meteo forecast",
      sourceUrl: forecastUrl,
      resolutionSource: "NOAA/Open-Meteo observed and forecast data",
      reason: `The 7-day forecast currently shows ${rain.toFixed(2)} inches of precipitation signal across the window.`,
    });
  }

  const threshold = Math.ceil(maxTemp / 5) * 5;
  return suggestion({
    title: `Will ${place.name} record a high temperature above ${threshold}F in the next 7 days?`,
    category: "weather",
    probability: clamp(35 + (maxTemp - threshold + 2) * 9, 12, 88),
    confidence: 72,
    source: "Open-Meteo forecast",
    sourceUrl: forecastUrl,
    resolutionSource: "NOAA observed station data",
    reason: `The latest forecast max is near ${maxTemp.toFixed(1)}F, so Scout generated the closest tradable threshold.`,
  });
}

async function stockSuggestion(query: string): Promise<CustomEventSuggestion | null> {
  const symbol = stockSymbolFromQuery(query);
  if (!symbol) return null;

  const url = `https://stooq.com/q/l/?s=${symbol.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`;
  const text = await safeText(url);
  const price = parseStooqPrice(text);
  if (!price) return null;

  const threshold = niceThreshold(price * 1.06);
  return suggestion({
    title: `Will ${symbol} close above $${formatThreshold(threshold)} in the next 30 days?`,
    category: "stocks",
    probability: 46,
    confidence: 61,
    source: "Stooq delayed quote + FMP/SEC fallback design",
    sourceUrl: url,
    resolutionSource: "Official split-adjusted closing data",
    reason: `${symbol} last quote is near $${formatThreshold(price)}. Scout created a 30-day upside threshold and marks confidence medium until FMP/SEC keys are connected.`,
  });
}

async function newsMomentumSuggestion(query: string): Promise<CustomEventSuggestion | null> {
  if (query.length < 4) return null;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=timelinevolraw&format=json`;
  const json = await safeJson<GdeltTimeline>(url);
  const values = json?.timeline?.slice(-7).map((item) => Number(item.value ?? 0)).filter(Number.isFinite) ?? [];
  if (values.length < 5) return null;

  const latest = values.at(-1) ?? 0;
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const momentum = average > 0 ? (latest - average) / average : 0;

  const category: EventCategory = /(bill|senate|house|election|fec|congress|president|court)/i.test(query)
    ? "politics"
    : /(movie|album|netflix|box office|trailer|streaming|music)/i.test(query)
      ? "entertainment"
      : "economics";

  return suggestion({
    title: `Will "${query}" news momentum increase over the next 7 days?`,
    category,
    probability: clamp(48 + momentum * 18, 20, 80),
    confidence: values.length >= 5 ? 52 : 38,
    source: "GDELT news momentum",
    sourceUrl: url,
    resolutionSource: "GDELT public news timeline",
    reason: `GDELT shows current topic volume ${momentum >= 0 ? "above" : "below"} its 7-day average. This is a watchlist-style event, not a settlement-ready cash market.`,
  });
}

async function sportsSuggestion(query: string): Promise<CustomEventSuggestion | null> {
  if (!/(beat|win|game|match|nba|nfl|mlb|nhl|mls|wnba|soccer|baseball|basketball|football|team)/i.test(query)) return null;
  if (!process.env.THE_ODDS_API_KEY) return null;
  return null;
}

function suggestion(input: Omit<CustomEventSuggestion, "id" | "lastUpdatedAt">) {
  return {
    ...input,
    id: `draft_${hash(input.title)}`,
    probability: Number(input.probability.toFixed(1)),
    confidence: Math.round(input.confidence),
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function safeJson<T>(url: string): Promise<T | null> {
  const text = await safeText(url, "application/json");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function safeText(url: string, accept = "text/plain") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, {
      headers: { Accept: accept },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseStooqPrice(csv: string | null) {
  if (!csv) return null;
  const [, row] = csv.trim().split(/\r?\n/);
  if (!row) return null;
  const cells = row.split(",");
  const close = Number(cells[6]);
  return Number.isFinite(close) && close > 0 ? close : null;
}

function stockSymbolFromQuery(query: string) {
  const lower = query.toLowerCase();
  for (const [key, symbol] of STOCK_SYMBOLS) {
    if (lower.includes(key)) return symbol;
  }
  const ticker = query.match(/\b[A-Z]{2,5}\b/)?.[0];
  return ticker ?? null;
}

function weatherCityFromQuery(query: string) {
  const match = query.match(/\bin\s+([A-Za-z ]{3,30})/i);
  return match?.[1]?.trim() ?? null;
}

function niceThreshold(value: number) {
  if (value >= 10000) return Math.round(value / 1000) * 1000;
  if (value >= 1000) return Math.round(value / 100) * 100;
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 1) return Math.round(value);
  return Number(value.toFixed(2));
}

function formatThreshold(value: number) {
  return value >= 1000 ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : value.toLocaleString("en-US");
}

function hash(input: string) {
  let value = 5381;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 33) ^ input.charCodeAt(index);
  }
  return (value >>> 0).toString(36);
}
