import type {
  EventSource,
  MarketPriceBar,
  PredictionEvent,
  ProbabilitySnapshot,
} from "@/lib/types";
import { clamp, daysAgo, daysFromNow } from "@/lib/utils";

const EVENT_DEFS: Array<{
  id: string;
  slug: string;
  title: string;
  category: PredictionEvent["category"];
  probability: number;
  confidence: number;
  provider: string;
  resolutionSource: string;
  resolutionRule: string;
  description: string;
}> = [
  {
    id: "evt_nba_celtics_knicks",
    slug: "celtics-beat-knicks-next-game",
    title: "Will Boston beat New York in their next listed game?",
    category: "sports",
    probability: 58,
    confidence: 78,
    provider: "The Odds API",
    resolutionSource: "Official sportsbook/result feed",
    resolutionRule: "YES resolves if Boston wins the listed matchup in regulation or overtime.",
    description: "Sports event generated from odds-implied probability with form and injury adjustments.",
  },
  {
    id: "evt_weather_phx_110",
    slug: "phoenix-above-110-this-week",
    title: "Will Phoenix record a high temperature above 110F this week?",
    category: "weather",
    probability: 46,
    confidence: 69,
    provider: "NOAA NWS + Open-Meteo",
    resolutionSource: "NOAA observed station data",
    resolutionRule: "YES resolves if NOAA observation for Phoenix exceeds 110F before the event close.",
    description: "Weather event using latest forecast, climatology, model agreement, and recent trend.",
  },
  {
    id: "evt_cpi_above_consensus",
    slug: "next-cpi-above-consensus",
    title: "Will next US CPI print above consensus?",
    category: "economics",
    probability: 41,
    confidence: 62,
    provider: "FRED + BLS",
    resolutionSource: "BLS official CPI release",
    resolutionRule: "YES resolves if the reported headline CPI change is above the stored consensus value.",
    description: "Macro event using nowcast, historical surprise distribution, and market-implied proxies.",
  },
  {
    id: "evt_nvda_150",
    slug: "nvda-above-150-by-quarter-end",
    title: "Will NVDA close above $150 by quarter end?",
    category: "stocks",
    probability: 53,
    confidence: 74,
    provider: "FMP + SEC EDGAR",
    resolutionSource: "FMP official close",
    resolutionRule: "YES resolves if split-adjusted NVDA close is above $150 on the final trading day.",
    description: "Equity threshold event using market price, volatility, filings/news catalyst, and history.",
  },
  {
    id: "evt_btc_120k",
    slug: "bitcoin-above-120k-by-q3",
    title: "Will Bitcoin trade above $120,000 by the end of Q3?",
    category: "crypto",
    probability: 49,
    confidence: 71,
    provider: "CoinGecko",
    resolutionSource: "CoinGecko market data",
    resolutionRule: "YES resolves if BTC/USD trades above $120,000 before the deadline.",
    description: "Crypto threshold event using price momentum, volatility, and historical break behavior.",
  },
  {
    id: "evt_bill_ai_safety",
    slug: "federal-ai-safety-bill-passes-house",
    title: "Will a federal AI safety bill pass the House this session?",
    category: "politics",
    probability: 36,
    confidence: 44,
    provider: "Congress.gov + GDELT",
    resolutionSource: "Congress.gov official bill status",
    resolutionRule: "YES resolves if a qualifying AI safety bill passes the US House before session end.",
    description: "Government event using official bill data, news momentum, and legislative history.",
  },
];

function seededWave(base: number, index: number, phase: number) {
  return clamp(base + Math.sin((index + phase) / 2.4) * 5 + Math.cos((index + phase) / 5.5) * 3, 5, 95);
}

export function seedEvents(): PredictionEvent[] {
  return EVENT_DEFS.map((event, index) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    status: "open",
    description: event.description,
    resolutionSource: event.resolutionSource,
    resolutionRule: event.resolutionRule,
    closesAt: daysFromNow(14 + index * 4),
    resolvesAt: daysFromNow(15 + index * 4),
    createdAt: daysAgo(30),
  }));
}

export function seedSources(): EventSource[] {
  return EVENT_DEFS.flatMap((event) => [
    {
      id: `src_${event.id}_primary`,
      eventId: event.id,
      provider: event.provider,
      providerUrl: providerUrl(event.provider),
      label: `${event.provider} primary signal`,
      lastUpdatedAt: daysAgo(0),
      status: event.confidence < 50 ? "stale" : "fresh",
    },
    {
      id: `src_${event.id}_baseline`,
      eventId: event.id,
      provider: "Andromeda Historical Baseline",
      providerUrl: "/data-sources",
      label: "Historical baseline and category prior",
      lastUpdatedAt: daysAgo(1),
      status: "fresh",
    },
  ]);
}

export function seedSnapshots(): ProbabilitySnapshot[] {
  return EVENT_DEFS.flatMap((event, eventIndex) => {
    return Array.from({ length: 24 }).map((_, index) => {
      const probability = seededWave(event.probability, index, eventIndex * 3);
      return {
        id: `snap_${event.id}_${index}`,
        eventId: event.id,
        probability: Number(probability.toFixed(2)),
        confidence: clamp(event.confidence - (index < 4 ? 4 : 0), 20, 95),
        sourceCount: event.confidence < 50 ? 2 : 4,
        dataFreshnessMinutes: event.confidence < 50 ? 260 : 18 + eventIndex * 9,
        explanation: explanationFor(event.category, probability),
        riskNotes: riskFor(event.category),
        createdAt: daysAgo(23 - index),
      };
    });
  });
}

export function seedBars(): MarketPriceBar[] {
  return seedSnapshots().map((snapshot) => ({
    id: `bar_${snapshot.id}`,
    eventId: snapshot.eventId,
    time: snapshot.createdAt,
    probability: snapshot.probability,
    volume: Math.round(2000 + snapshot.probability * 120 + Math.sin(snapshot.probability) * 800),
  }));
}

function providerUrl(provider: string) {
  if (provider.includes("Odds")) return "https://api.the-odds-api.com/docs";
  if (provider.includes("NOAA")) return "https://www.weather.gov/documentation/services-web-api";
  if (provider.includes("FRED")) return "https://fred.stlouisfed.org/docs/api/fred/";
  if (provider.includes("FMP")) return "https://site.financialmodelingprep.com/developer/docs";
  if (provider.includes("CoinGecko")) return "https://www.coingecko.com/en/api";
  if (provider.includes("Congress")) return "https://api.congress.gov/";
  return "/data-sources";
}

function explanationFor(category: PredictionEvent["category"], probability: number) {
  const direction = probability >= 50 ? "supportive" : "cautious";
  const map: Record<PredictionEvent["category"], string> = {
    sports: `Odds-implied probability is ${direction}, with form and injury adjustments included.`,
    weather: `Forecast model blend is ${direction}, with climatology and recent trend blended in.`,
    economics: `Nowcast and historical surprise data produce a ${direction} macro read.`,
    stocks: `Price action, volatility, and catalyst history create a ${direction} threshold setup.`,
    crypto: `Crypto momentum and volatility history create a ${direction} breakout read.`,
    politics: `Official data and news momentum remain ${direction}, with lower source confidence.`,
    entertainment: `Media trend and release-calendar signals are ${direction}.`,
  };
  return map[category];
}

function riskFor(category: PredictionEvent["category"]) {
  const map: Record<PredictionEvent["category"], string> = {
    sports: "Late injuries and lineup news can move the probability quickly.",
    weather: "Forecast model spread can be wide until the event window is closer.",
    economics: "Consensus can shift before release and revisions may change interpretation.",
    stocks: "Volatility and earnings/news catalysts can invalidate technical signals.",
    crypto: "High volatility and weekend liquidity can cause large probability swings.",
    politics: "Official action may be delayed and news sentiment can be noisy.",
    entertainment: "Data quality is weaker; use this as a watchlist signal only.",
  };
  return map[category];
}
