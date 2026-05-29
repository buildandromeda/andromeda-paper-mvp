import { createHash } from "node:crypto";
import type {
  EventCategory,
  EventSource,
  MarketPriceBar,
  PredictionEvent,
  ProbabilitySnapshot,
} from "@/lib/types";
import { clamp, daysFromNow, nowIso } from "@/lib/utils";

export type LiveEvent = PredictionEvent & {
  latest: ProbabilitySnapshot;
  sources: EventSource[];
  history: ProbabilitySnapshot[];
  bars: MarketPriceBar[];
};

export type LiveFeedResult = {
  events: LiveEvent[];
  warnings: string[];
  missingKeys: string[];
  updatedAt: string;
  source: string;
};

type FeedFilters = {
  category?: EventCategory | "all";
  q?: string;
};

type OpenMeteoGeo = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country_code?: string;
  }>;
};

type OpenMeteoForecast = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    precipitation_sum?: number[];
  };
};

type CoinGeckoMarket = {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
  last_updated?: string;
  sparkline_in_7d?: { price?: number[] };
};

type OddsApiGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    title: string;
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; price: number }>;
    }>;
  }>;
};

type StooqBar = {
  date: string;
  close: number;
  volume?: number;
};

type FmpHistorical = {
  historical?: Array<{ date?: string; close?: number; volume?: number }>;
};

type GdeltTimeline = {
  timeline?: Array<{ date?: string; value?: number }>;
};

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
  "Houston",
  "Philadelphia",
  "Washington",
  "Minneapolis",
  "Tampa",
  "Portland",
  "Nashville",
  "Charlotte",
];

const CRYPTO_ASSETS = [
  ["bitcoin", "Bitcoin", "BTC"],
  ["ethereum", "Ethereum", "ETH"],
  ["solana", "Solana", "SOL"],
  ["dogecoin", "Dogecoin", "DOGE"],
  ["cardano", "Cardano", "ADA"],
  ["chainlink", "Chainlink", "LINK"],
  ["avalanche-2", "Avalanche", "AVAX"],
  ["sui", "Sui", "SUI"],
  ["litecoin", "Litecoin", "LTC"],
  ["ripple", "XRP", "XRP"],
] as const;

const STOCK_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "META",
  "GOOGL",
  "AMD",
  "COIN",
  "PLTR",
  "SPY",
  "QQQ",
] as const;

const SPORTS_KEYS = [
  "baseball_mlb",
  "basketball_nba",
  "icehockey_nhl",
  "americanfootball_nfl",
  "soccer_usa_mls",
  "soccer_epl",
] as const;

const NEWS_TOPICS = [
  { query: "Federal Reserve rate cut", category: "economics" as const, label: "Fed rate-cut momentum" },
  { query: "US CPI inflation", category: "economics" as const, label: "CPI inflation momentum" },
  { query: "US government shutdown", category: "politics" as const, label: "Government shutdown momentum" },
  { query: "Congress crypto regulation", category: "politics" as const, label: "Crypto regulation momentum" },
  { query: "AI regulation bill", category: "politics" as const, label: "AI regulation momentum" },
  { query: "box office opening weekend", category: "entertainment" as const, label: "Box office momentum" },
];

export async function buildLiveEventFeed(filters: FeedFilters = {}): Promise<LiveFeedResult> {
  const warnings: string[] = [];
  const missingKeys: string[] = [];
  const tasks = [
    weatherEvents(warnings),
    cryptoEvents(warnings),
    stockEvents(warnings),
    sportsEvents(warnings, missingKeys),
    newsMomentumEvents(warnings),
    economicsEvents(warnings, missingKeys),
  ];

  const settled = await Promise.allSettled(tasks);
  const events = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  for (const result of settled) {
    if (result.status === "rejected") warnings.push(result.reason instanceof Error ? result.reason.message : "A provider failed.");
  }

  const q = filters.q?.toLowerCase().trim();
  const filtered = events
    .filter((event) => !filters.category || filters.category === "all" || event.category === filters.category)
    .filter((event) => !q || [
      event.title,
      event.category,
      event.description,
      event.resolutionSource,
      event.latest.calculation?.provider ?? "",
    ].join(" ").toLowerCase().includes(q))
    .sort(sortEvents);

  return {
    events: filtered,
    warnings: [...new Set(warnings)],
    missingKeys: [...new Set(missingKeys)],
    updatedAt: nowIso(),
    source: "live-provider-feed",
  };
}

export async function getLiveEvent(idOrSlug: string) {
  const feed = await buildLiveEventFeed({ category: "all" });
  return feed.events.find((event) => event.id === idOrSlug || event.slug === idOrSlug) ?? null;
}

async function weatherEvents(warnings: string[]) {
  const results = await Promise.allSettled(WEATHER_CITIES.map(weatherCityEvents));
  return results.flatMap((result) => {
    if (result.status === "fulfilled") return result.value;
    warnings.push("Open-Meteo weather adapter returned incomplete data for one city.");
    return [];
  });
}

async function weatherCityEvents(city: string): Promise<LiveEvent[]> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geo = await safeJson<OpenMeteoGeo>(geoUrl, 3500);
  const place = geo?.results?.[0];
  if (!place) return [];

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&forecast_days=7`;
  const forecast = await safeJson<OpenMeteoForecast>(forecastUrl, 3500);
  const highs = forecast?.daily?.temperature_2m_max?.filter(Number.isFinite) ?? [];
  const rain = forecast?.daily?.precipitation_sum?.filter(Number.isFinite) ?? [];
  if (!highs.length) return [];

  const maxTemp = Math.max(...highs);
  const tempThreshold = Math.ceil(maxTemp / 5) * 5;
  const rainTotal = rain.reduce((sum, value) => sum + value, 0);
  const rainThreshold = rainTotal >= 0.75 ? 1 : 0.5;
  const label = `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}`;

  return [
    makeEvent({
      title: `Will ${label} record a high above ${tempThreshold}F in the next 7 days?`,
      category: "weather",
      probability: clamp(42 + (maxTemp - tempThreshold) * 8 + Math.max(0, highs.filter((value) => value >= tempThreshold).length - 1) * 8, 8, 92),
      confidence: 72,
      sourceCount: 1,
      freshnessMinutes: 20,
      provider: "Open-Meteo forecast",
      sourceUrl: forecastUrl,
      formula: "42 + ((forecast max - threshold) * 8) + extra hot-day bonus",
      inputs: [
        { label: "7-day forecast max", value: `${maxTemp.toFixed(1)}F` },
        { label: "Threshold", value: `${tempThreshold}F` },
        { label: "Days at/above threshold", value: String(highs.filter((value) => value >= tempThreshold).length) },
      ],
      description: `A forecast-derived weather event for ${label}. This uses Open-Meteo live forecast data and should be resolved against official observed weather data.`,
      resolutionSource: "NOAA observed station data / Open-Meteo historical fallback",
      resolutionRule: `Resolve YES if the official observed high temperature for ${label} exceeds ${tempThreshold}F before the event closes.`,
      closesAt: daysFromNow(7),
      riskNotes: "Forecasts can shift quickly. Confidence drops when model agreement or official station data is unavailable.",
    }),
    makeEvent({
      title: `Will ${label} receive more than ${rainThreshold} inch of rain in the next 7 days?`,
      category: "weather",
      probability: clamp(24 + rainTotal * 38, 5, 88),
      confidence: 68,
      sourceCount: 1,
      freshnessMinutes: 20,
      provider: "Open-Meteo precipitation forecast",
      sourceUrl: forecastUrl,
      formula: "24 + (forecast 7-day precipitation inches * 38)",
      inputs: [
        { label: "7-day precipitation forecast", value: `${rainTotal.toFixed(2)} in` },
        { label: "Threshold", value: `${rainThreshold} in` },
      ],
      description: `A forecast-derived rainfall event for ${label}.`,
      resolutionSource: "NOAA observed station data / Open-Meteo historical fallback",
      resolutionRule: `Resolve YES if observed precipitation in ${label} exceeds ${rainThreshold} inch before the event closes.`,
      closesAt: daysFromNow(7),
      riskNotes: "Localized precipitation can vary by station. This should be reviewed if source feeds conflict.",
    }),
  ];
}

async function cryptoEvents(warnings: string[]) {
  const ids = CRYPTO_ASSETS.map(([id]) => id).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=true`;
  const markets = await safeJson<CoinGeckoMarket[]>(url, 5000, coinGeckoHeaders());
  if (!Array.isArray(markets)) {
    warnings.push("CoinGecko crypto adapter is unavailable right now, so crypto events are hidden instead of faked.");
    return [];
  }

  return CRYPTO_ASSETS.flatMap(([id, label, symbol]) => {
    const item = markets.find((market) => market.id === id);
    if (!item?.current_price) return [];
    const price = item.current_price;
    const change = item.price_change_percentage_24h ?? 0;
    const upsideThreshold = niceThreshold(price * 1.05);
    const downsideThreshold = niceThreshold(price * 0.95);
    const sparkline = item.sparkline_in_7d?.price?.filter(Number.isFinite) ?? [];
    const upsideHistory = cryptoProbabilityHistory(sparkline, upsideThreshold, "above");
    const downsideHistory = cryptoProbabilityHistory(sparkline, downsideThreshold, "below");
    const freshness = item.last_updated
      ? Math.max(1, Math.round((Date.now() - new Date(item.last_updated).getTime()) / 60_000))
      : 15;

    return [
      makeEvent({
        title: `Will ${label} trade above $${formatNumber(upsideThreshold)} in the next 14 days?`,
        category: "crypto",
        probability: cryptoThresholdProbability(sparkline, upsideThreshold, "above", price),
        confidence: item.last_updated ? 70 : 58,
        sourceCount: 1,
        freshnessMinutes: freshness,
        provider: "CoinGecko market data",
        sourceUrl: url,
        formula: "52 + (6-hour momentum * 1.4) - (distance to threshold * 2.1), clamped 8-90",
        inputs: [
          { label: "Spot price", value: `$${formatNumber(price)}` },
          { label: "24h change", value: `${change.toFixed(2)}%` },
          { label: "Threshold", value: `$${formatNumber(upsideThreshold)}` },
          { label: "24h volume", value: item.total_volume ? `$${formatNumber(item.total_volume)}` : "not returned" },
          { label: "History bars", value: String(upsideHistory.length) },
        ],
        description: `${symbol} threshold event priced from live CoinGecko spot data and short-term momentum.`,
        resolutionSource: "CoinGecko USD market data",
        resolutionRule: `Resolve YES if CoinGecko reports ${label} trading above $${formatNumber(upsideThreshold)} before the event closes.`,
        closesAt: daysFromNow(14),
        riskNotes: "Crypto prices are volatile and exchange aggregation can temporarily lag during extreme market conditions.",
        history: upsideHistory,
      }),
      makeEvent({
        title: `Will ${label} trade below $${formatNumber(downsideThreshold)} in the next 14 days?`,
        category: "crypto",
        probability: cryptoThresholdProbability(sparkline, downsideThreshold, "below", price),
        confidence: item.last_updated ? 70 : 58,
        sourceCount: 1,
        freshnessMinutes: freshness,
        provider: "CoinGecko market data",
        sourceUrl: url,
        formula: "52 - (6-hour momentum * 1.4) - (distance to downside threshold * 2.1), clamped 8-90",
        inputs: [
          { label: "Spot price", value: `$${formatNumber(price)}` },
          { label: "24h change", value: `${change.toFixed(2)}%` },
          { label: "Threshold", value: `$${formatNumber(downsideThreshold)}` },
          { label: "History bars", value: String(downsideHistory.length) },
        ],
        description: `${symbol} downside threshold event priced from live CoinGecko spot data and short-term momentum.`,
        resolutionSource: "CoinGecko USD market data",
        resolutionRule: `Resolve YES if CoinGecko reports ${label} trading below $${formatNumber(downsideThreshold)} before the event closes.`,
        closesAt: daysFromNow(14),
        riskNotes: "This is a short-horizon paper event and not investment advice.",
        history: downsideHistory,
      }),
    ];
  });
}

async function stockEvents(warnings: string[]) {
  const results = await Promise.allSettled(STOCK_SYMBOLS.map(stockSymbolEvents));
  const events = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!events.length) warnings.push("Stock quote adapter returned no usable data. Add FMP_API_KEY for a stronger production feed.");
  return events;
}

async function stockSymbolEvents(symbol: string): Promise<LiveEvent[]> {
  const source = await stockBars(symbol);
  const { bars, url, provider, confidence } = source;
  if (bars.length < 12) return [];

  const latest = bars.at(-1)!;
  const prior = bars.at(-6) ?? bars[0]!;
  const change5d = ((latest.close - prior.close) / prior.close) * 100;
  const closes = bars.map((bar) => bar.close);
  const sma20 = closes.slice(-20).reduce((sum, value) => sum + value, 0) / Math.min(20, closes.length);
  const technical = ((latest.close - sma20) / sma20) * 100;
  const upsideThreshold = niceThreshold(latest.close * 1.05);
  const downsideThreshold = niceThreshold(latest.close * 0.95);
  const upsideProbability = stockThresholdProbability(bars, upsideThreshold, "above");
  const downsideProbability = stockThresholdProbability(bars, downsideThreshold, "below");
  const upsideHistory = stockProbabilityHistory(bars, upsideThreshold, "above");
  const downsideHistory = stockProbabilityHistory(bars, downsideThreshold, "below");
  const freshness = Math.max(90, Math.round((Date.now() - new Date(`${latest.date}T21:00:00Z`).getTime()) / 60_000));

  return [
    makeEvent({
      title: `Will ${symbol} close above $${formatNumber(upsideThreshold)} in the next 30 days?`,
      category: "stocks",
      probability: upsideProbability,
      confidence,
      sourceCount: 1,
      freshnessMinutes: freshness,
      provider,
      sourceUrl: url,
      formula: "52 + (5-day change * 1.2) + (SMA20 gap * 0.7) - (distance to threshold * 1.8), clamped 8-88",
      inputs: [
        { label: "Latest close", value: `$${formatNumber(latest.close)}` },
        { label: "5-day change", value: `${change5d.toFixed(2)}%` },
        { label: "SMA20 gap", value: `${technical.toFixed(2)}%` },
        { label: "Threshold", value: `$${formatNumber(upsideThreshold)}` },
      ],
      description: `${symbol} paper threshold event calculated from ${provider}.`,
      resolutionSource: "Official split-adjusted closing data via FMP/Stooq fallback",
      resolutionRule: `Resolve YES if ${symbol} closes above $${formatNumber(upsideThreshold)} before the event closes.`,
      closesAt: daysFromNow(30),
      riskNotes: provider.includes("FMP")
        ? "Equity thresholds are sensitive to earnings, splits, and after-hours news."
        : "Fallback quote history is delayed and not a broker quote. Use FMP for production launch and label delayed feeds clearly.",
      history: upsideHistory,
    }),
    makeEvent({
      title: `Will ${symbol} close below $${formatNumber(downsideThreshold)} in the next 30 days?`,
      category: "stocks",
      probability: downsideProbability,
      confidence,
      sourceCount: 1,
      freshnessMinutes: freshness,
      provider,
      sourceUrl: url,
      formula: "52 - (5-day change * 1.2) - (SMA20 gap * 0.7) - (distance to downside threshold * 1.8), clamped 8-88",
      inputs: [
        { label: "Latest close", value: `$${formatNumber(latest.close)}` },
        { label: "5-day change", value: `${change5d.toFixed(2)}%` },
        { label: "SMA20 gap", value: `${technical.toFixed(2)}%` },
        { label: "Threshold", value: `$${formatNumber(downsideThreshold)}` },
      ],
      description: `${symbol} downside paper threshold event calculated from ${provider}.`,
      resolutionSource: "Official split-adjusted closing data via FMP/Stooq fallback",
      resolutionRule: `Resolve YES if ${symbol} closes below $${formatNumber(downsideThreshold)} before the event closes.`,
      closesAt: daysFromNow(30),
      riskNotes: "Equity thresholds are sensitive to earnings, splits, and after-hours news. FMP and SEC feeds should be connected before launch marketing.",
      history: downsideHistory,
    }),
  ];
}

async function sportsEvents(warnings: string[], missingKeys: string[]) {
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) {
    missingKeys.push("THE_ODDS_API_KEY");
    warnings.push("Sports markets are hidden until THE_ODDS_API_KEY is set. No fake Lakers/Celtics-style sports events are shown.");
    return [];
  }

  const results = await Promise.allSettled(SPORTS_KEYS.map((sport) => oddsEventsForSport(sport, key)));
  const events = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!events.length) warnings.push("The Odds API returned no upcoming games for the configured sports.");
  return events.slice(0, 80);
}

async function oddsEventsForSport(sport: string, apiKey: string): Promise<LiveEvent[]> {
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`;
  const games = await safeJson<OddsApiGame[]>(url, 5000);
  if (!Array.isArray(games)) return [];

  return games.flatMap((game) => {
    const homeProbability = sportsbookProbability(game, game.home_team);
    if (!homeProbability) return [];
    const date = new Date(game.commence_time);
    return makeEvent({
      title: `Will ${game.home_team} beat ${game.away_team} on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}?`,
      category: "sports",
      probability: homeProbability.probability,
      confidence: clamp(65 + Math.min(12, homeProbability.bookmakerCount * 2), 55, 84),
      sourceCount: homeProbability.bookmakerCount,
      freshnessMinutes: 10,
      provider: "The Odds API sportsbook consensus",
      sourceUrl: "https://the-odds-api.com/",
      formula: "Average US sportsbook implied probability for home team, normalized against the away side",
      inputs: [
        { label: "Home team", value: game.home_team },
        { label: "Away team", value: game.away_team },
        { label: "Avg home implied probability", value: `${homeProbability.probability.toFixed(1)}%` },
        { label: "Bookmakers sampled", value: String(homeProbability.bookmakerCount) },
        { label: "Sport", value: game.sport_title },
      ],
      description: `Sportsbook-implied paper event for ${game.sport_title}. Generated only from live upcoming games returned by The Odds API.`,
      resolutionSource: "Official league result feed / The Odds API event result fallback",
      resolutionRule: `Resolve YES if ${game.home_team} wins the listed matchup against ${game.away_team}.`,
      closesAt: game.commence_time,
      riskNotes: "Sportsbook prices include vig and can move with injury/news updates. This is paper analysis only.",
    });
  });
}

async function newsMomentumEvents(warnings: string[]) {
  const results = await Promise.allSettled(NEWS_TOPICS.map(newsTopicEvent));
  const events = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  if (!events.length) warnings.push("GDELT news momentum adapter returned no usable timeline data.");
  return events;
}

async function newsTopicEvent(topic: typeof NEWS_TOPICS[number]): Promise<LiveEvent | null> {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(topic.query)}&mode=timelinevolraw&format=json`;
  const json = await safeJson<GdeltTimeline>(url, 4500);
  const values = json?.timeline?.slice(-14).map((item) => Number(item.value ?? 0)).filter(Number.isFinite) ?? [];
  if (values.length < 4) return null;

  const latest = values.at(-1)!;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const momentum = average > 0 ? ((latest - average) / average) * 100 : 0;

  return makeEvent({
    title: `Will ${topic.label} rise above its 14-day average in the next 7 days?`,
    category: topic.category,
    probability: clamp(50 + momentum * 0.28, 18, 82),
    confidence: 46,
    sourceCount: 1,
    freshnessMinutes: 60,
    provider: "GDELT news timeline",
    sourceUrl: url,
    formula: "50 + ((latest topic volume vs 14-day average) * 0.28), clamped 18-82",
    inputs: [
      { label: "Latest topic volume", value: latest.toFixed(4) },
      { label: "14-day average", value: average.toFixed(4) },
      { label: "Momentum", value: `${momentum.toFixed(1)}%` },
    ],
    description: `A source-backed news-momentum event for ${topic.query}. This is useful for watchlists and model feedback, not a cash market.`,
    resolutionSource: "GDELT public news timeline",
    resolutionRule: "Resolve YES if the topic's GDELT daily volume is above its trailing 14-day average during the event window.",
    closesAt: daysFromNow(7),
    riskNotes: "News momentum is not the same as outcome probability. Confidence is intentionally low until official outcome sources are added.",
  });
}

async function economicsEvents(warnings: string[], missingKeys: string[]) {
  if (!process.env.FRED_API_KEY) {
    missingKeys.push("FRED_API_KEY");
    warnings.push("Economics release markets need FRED_API_KEY/BLS/BEA keys for production-grade official data. No consensus numbers are fabricated.");
    return [];
  }

  // Keep economics conservative until a consensus/nowcast provider is connected.
  warnings.push("FRED key is present, but consensus/nowcast inputs are still required before economics events are tradeable.");
  return [];
}

function makeEvent(input: {
  title: string;
  category: EventCategory;
  probability: number;
  confidence: number;
  sourceCount: number;
  freshnessMinutes: number;
  provider: string;
  sourceUrl: string;
  formula: string;
  inputs: Array<{ label: string; value: string }>;
  description: string;
  resolutionSource: string;
  resolutionRule: string;
  closesAt: string;
  riskNotes: string;
  history?: Array<{ time: string; probability: number; volume?: number }>;
}): LiveEvent {
  const id = stableUuid(input.title);
  const createdAt = nowIso();
  const probability = Number(clamp(input.probability, 1, 99).toFixed(2));
  const confidence = Number(clamp(input.confidence, 1, 99).toFixed(2));
  const slug = slugify(input.title);
  const warning = input.confidence < 55 ? "Low-confidence event: use for paper analysis only." : "";
  const snapshot: ProbabilitySnapshot = {
    id: stableUuid(`${input.title}:snapshot:${createdAt}`),
    eventId: id,
    probability,
    confidence,
    sourceCount: input.sourceCount,
    dataFreshnessMinutes: input.freshnessMinutes,
    explanation: `${input.provider} generated ${probability.toFixed(1)}% using: ${input.formula}.`,
    riskNotes: input.riskNotes,
    createdAt,
    calculation: {
      provider: input.provider,
      sourceUrl: input.sourceUrl,
      formula: input.formula,
      inputs: input.inputs,
      warnings: [warning].filter(Boolean),
      isProviderBacked: true,
    },
  };

  const history = (input.history && input.history.length >= 2 ? input.history : [{ time: createdAt, probability, volume: 0 }])
    .map((point, index) => ({
      ...snapshot,
      id: stableUuid(`${input.title}:snapshot:${point.time}:${index}`),
      probability: Number(clamp(point.probability, 1, 99).toFixed(2)),
      createdAt: point.time,
    }));

  const bars = history.map((point, index) => ({
    id: stableUuid(`${input.title}:bar:${point.createdAt}:${index}`),
    eventId: id,
    time: point.createdAt,
    probability: point.probability,
    volume: input.history?.[index]?.volume ?? 0,
  }));

  return {
    id,
    slug,
    title: input.title,
    category: input.category,
    status: new Date(input.closesAt).getTime() > Date.now() ? "open" : "closed",
    description: input.description,
    resolutionSource: input.resolutionSource,
    resolutionRule: input.resolutionRule,
    closesAt: input.closesAt,
    resolvesAt: input.closesAt,
    createdAt,
    tradeable: true,
    providerBacked: true,
    sourceWarnings: snapshot.calculation?.warnings,
    latest: snapshot,
    history,
    bars,
    sources: [{
      id: stableUuid(`${input.title}:source`),
      eventId: id,
      provider: input.provider,
      providerUrl: input.sourceUrl,
      label: input.provider,
      lastUpdatedAt: createdAt,
      status: input.freshnessMinutes > 360 ? "stale" : "fresh",
    }],
  };
}

function sportsbookProbability(game: OddsApiGame, team: string) {
  const pairs: Array<{ target: number; other: number }> = [];
  for (const book of game.bookmakers ?? []) {
    const h2h = book.markets?.find((market) => market.key === "h2h");
    const target = h2h?.outcomes?.find((outcome) => outcome.name === team)?.price;
    const other = h2h?.outcomes?.find((outcome) => outcome.name !== team)?.price;
    if (typeof target === "number" && typeof other === "number") {
      const targetImplied = americanOddsToProbability(target);
      const otherImplied = americanOddsToProbability(other);
      const normalized = (targetImplied / (targetImplied + otherImplied)) * 100;
      if (Number.isFinite(normalized)) pairs.push({ target: normalized, other: 100 - normalized });
    }
  }

  if (!pairs.length) return null;
  return {
    probability: pairs.reduce((sum, pair) => sum + pair.target, 0) / pairs.length,
    bookmakerCount: pairs.length,
  };
}

function americanOddsToProbability(price: number) {
  if (price < 0) return Math.abs(price) / (Math.abs(price) + 100);
  return 100 / (price + 100);
}

function parseStooqBars(csv: string | null): StooqBar[] {
  if (!csv) return [];
  const [, ...rows] = csv.trim().split(/\r?\n/);
  return rows.map((row) => {
    const [date, , , , close] = row.split(",");
    return { date, close: Number(close) };
  }).filter((bar) => bar.date && Number.isFinite(bar.close) && bar.close > 0);
}

async function stockBars(symbol: string): Promise<{
  bars: StooqBar[];
  url: string;
  provider: string;
  confidence: number;
}> {
  if (process.env.FMP_API_KEY) {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?timeseries=60&apikey=${process.env.FMP_API_KEY}`;
    const json = await safeJson<FmpHistorical>(url, 5000);
    const bars = (json?.historical ?? [])
      .map((row) => ({
        date: row.date ?? "",
        close: Number(row.close),
        volume: Number(row.volume ?? 0),
      }))
      .filter((bar) => bar.date && Number.isFinite(bar.close) && bar.close > 0)
      .reverse()
      .slice(-60);

    return {
      bars,
      url: "https://financialmodelingprep.com/api/v3/historical-price-full/{symbol}",
      provider: "Financial Modeling Prep historical prices",
      confidence: 72,
    };
  }

  const url = `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&i=d`;
  const csv = await safeText(url, 4000, { Accept: "text/csv" });
  return {
    bars: parseStooqBars(csv).slice(-60),
    url: "https://stooq.com/q/d/l/",
    provider: "Stooq delayed daily price history",
    confidence: 58,
  };
}

function stockProbabilityHistory(bars: StooqBar[], threshold: number, direction: "above" | "below") {
  return bars.slice(-35).map((bar, index, recentBars) => {
    const absoluteIndex = bars.length - recentBars.length + index + 1;
    const slice = bars.slice(0, absoluteIndex);
    return {
      time: `${bar.date}T21:00:00Z`,
      probability: stockThresholdProbability(slice, threshold, direction),
      volume: 0,
    };
  });
}

function stockThresholdProbability(bars: StooqBar[], threshold: number, direction: "above" | "below") {
  const latest = bars.at(-1);
  if (!latest) return 50;
  const prior = bars.at(-6) ?? bars[0]!;
  const closes = bars.map((bar) => bar.close);
  const smaWindow = closes.slice(-20);
  const sma20 = smaWindow.reduce((sum, value) => sum + value, 0) / Math.max(1, smaWindow.length);
  const change5d = ((latest.close - prior.close) / prior.close) * 100;
  const technical = ((latest.close - sma20) / sma20) * 100;
  const distance = direction === "above"
    ? ((threshold - latest.close) / latest.close) * 100
    : ((latest.close - threshold) / latest.close) * 100;
  const momentum = change5d * 1.2 + technical * 0.7;
  const raw = direction === "above"
    ? 52 + momentum - distance * 1.8
    : 52 - momentum - distance * 1.8;
  return Number(clamp(raw, 8, 88).toFixed(2));
}

function cryptoProbabilityHistory(prices: number[], threshold: number, direction: "above" | "below") {
  const usable = prices.filter((price) => Number.isFinite(price) && price > 0).slice(-84);
  const start = Date.now() - usable.length * 60 * 60 * 1000;
  return usable.map((price, index) => ({
    time: new Date(start + index * 60 * 60 * 1000).toISOString(),
    probability: cryptoThresholdProbability(usable.slice(0, index + 1), threshold, direction, price),
    volume: 0,
  }));
}

function cryptoThresholdProbability(prices: number[], threshold: number, direction: "above" | "below", fallbackPrice?: number) {
  const usable = prices.filter((price) => Number.isFinite(price) && price > 0);
  const latest = usable.at(-1) ?? fallbackPrice;
  if (!latest) return 50;
  const prior = usable.at(-7) ?? usable[0] ?? latest;
  const momentum = ((latest - prior) / prior) * 100;
  const distance = direction === "above"
    ? ((threshold - latest) / latest) * 100
    : ((latest - threshold) / latest) * 100;
  const raw = direction === "above"
    ? 52 + momentum * 1.4 - distance * 2.1
    : 52 - momentum * 1.4 - distance * 2.1;
  return Number(clamp(raw, 8, 90).toFixed(2));
}

async function safeJson<T>(url: string, timeoutMs = 3000, headers?: Record<string, string>): Promise<T | null> {
  const text = await safeText(url, timeoutMs, { Accept: "application/json", ...(headers ?? {}) });
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function safeText(url: string, timeoutMs = 3000, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers,
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

function coinGeckoHeaders() {
  return process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : undefined;
}

function stableUuid(input: string) {
  const hex = createHash("md5").update(input).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function niceThreshold(value: number) {
  if (value >= 10000) return Math.round(value / 1000) * 1000;
  if (value >= 1000) return Math.round(value / 100) * 100;
  if (value >= 100) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  if (value >= 1) return Math.round(value * 10) / 10;
  return Number(value.toFixed(3));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : value >= 1 ? 2 : 4,
  });
}

function sortEvents(a: LiveEvent, b: LiveEvent) {
  if (a.providerBacked !== b.providerBacked) return a.providerBacked ? -1 : 1;
  if (a.category !== b.category) return categoryWeight(b.category) - categoryWeight(a.category);
  if (a.latest.confidence !== b.latest.confidence) return b.latest.confidence - a.latest.confidence;
  return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
}

function categoryWeight(category: EventCategory) {
  const weights: Record<EventCategory, number> = {
    sports: 9,
    weather: 8,
    crypto: 7,
    stocks: 6,
    economics: 5,
    politics: 4,
    entertainment: 3,
  };
  return weights[category];
}
