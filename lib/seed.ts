import type {
  EventSource,
  MarketPriceBar,
  PredictionEvent,
  ProbabilitySnapshot,
} from "@/lib/types";
import { clamp, daysAgo, daysFromNow } from "@/lib/utils";

type EventDef = {
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
  closesInDays?: number;
};

const eventIndexCounter = (() => {
  let value = 0;
  return { next: () => ++value };
})();

const EVENT_DEFS: EventDef[] = [
  sports("Will the Boston Celtics beat the New York Knicks in their next listed game?", 58, 78, "celtics-beat-knicks-next-game"),
  sports("Will the Los Angeles Lakers win their next listed home game?", 47, 72, "lakers-win-next-home-game"),
  sports("Will the New York Yankees beat the Boston Red Sox in their next series opener?", 54, 70, "yankees-beat-red-sox-series-opener"),
  sports("Will the Los Angeles Dodgers score at least 5 runs in their next listed game?", 51, 68, "dodgers-score-five-runs-next-game"),
  sports("Will the Kansas City Chiefs win their next season opener?", 63, 66, "chiefs-win-next-season-opener"),
  sports("Will Arsenal beat Tottenham in their next North London derby?", 49, 64, "arsenal-beat-tottenham-next-derby"),
  sports("Will Inter Miami win its next listed MLS match?", 52, 61, "inter-miami-win-next-mls-match"),
  sports("Will the USMNT win its next competitive match?", 57, 63, "usmnt-win-next-competitive-match"),
  sports("Will the Dallas Cowboys win their next listed game?", 46, 60, "cowboys-win-next-listed-game"),
  sports("Will the Las Vegas Aces win their next listed WNBA game?", 67, 72, "aces-win-next-wnba-game"),

  weather("Will Phoenix record a high temperature above 110F this week?", 46, 69, "phoenix-above-110-this-week"),
  weather("Will New York City record a high temperature above 90F in the next 7 days?", 39, 71, "nyc-above-90-next-seven-days"),
  weather("Will Miami receive more than 2 inches of rain in the next 7 days?", 42, 68, "miami-two-inches-rain-next-seven-days"),
  weather("Will Seattle record measurable rain this week?", 61, 77, "seattle-measurable-rain-this-week"),
  weather("Will Chicago O'Hare record wind gusts above 35 mph this week?", 33, 64, "chicago-ohare-wind-gusts-35-this-week"),
  weather("Will Dallas record a heat index above 105F in the next 10 days?", 44, 66, "dallas-heat-index-105-next-ten-days"),
  weather("Will Denver record measurable snow before October 31?", 28, 58, "denver-measurable-snow-before-oct-31"),
  weather("Will Los Angeles Downtown record a high above 85F this week?", 48, 69, "la-downtown-above-85-this-week"),
  weather("Will a named Atlantic tropical storm form before June 30?", 35, 62, "atlantic-tropical-storm-before-june-30"),
  weather("Will San Francisco record foggy morning conditions at least 3 times this week?", 56, 63, "sf-fog-three-mornings-this-week"),

  economics("Will the next US CPI print come in above consensus?", 41, 62, "next-cpi-above-consensus"),
  economics("Will the Federal Reserve hold rates steady at the next FOMC meeting?", 64, 72, "fed-hold-rates-next-fomc"),
  economics("Will the next US unemployment rate be above 4.5%?", 37, 67, "next-unemployment-rate-above-4-5"),
  economics("Will the next retail sales report show positive month-over-month growth?", 55, 64, "retail-sales-positive-next-report"),
  economics("Will the next core PCE print come in above consensus?", 45, 61, "core-pce-above-consensus-next-print"),
  economics("Will initial jobless claims print above 250,000 next release?", 32, 59, "jobless-claims-above-250k-next-release"),
  economics("Will the US 10-year Treasury yield close above 4.50% this month?", 43, 63, "us-10y-above-4-50-this-month"),
  economics("Will next quarter US GDP annualized growth exceed 2.0%?", 52, 60, "next-gdp-growth-above-two-percent"),
  economics("Will headline inflation fall below 3.0% by year end?", 47, 58, "headline-inflation-below-three-year-end"),
  economics("Will the next ISM manufacturing PMI print above 50?", 38, 57, "ism-manufacturing-above-50-next-print"),

  stocks("Will NVDA close above $150 by quarter end?", 53, 74, "nvda-above-150-by-quarter-end"),
  stocks("Will TSLA close above $250 by the end of next month?", 44, 66, "tsla-above-250-end-next-month"),
  stocks("Will AAPL close above $220 by quarter end?", 49, 70, "aapl-above-220-by-quarter-end"),
  stocks("Will MSFT close above $500 before the next earnings report?", 51, 68, "msft-above-500-before-earnings"),
  stocks("Will GOOGL close above $200 by the end of next month?", 47, 65, "googl-above-200-end-next-month"),
  stocks("Will AMZN close above $220 by quarter end?", 54, 67, "amzn-above-220-by-quarter-end"),
  stocks("Will SPY make a new 30-day high this week?", 57, 64, "spy-new-30-day-high-this-week"),
  stocks("Will QQQ close above $500 by Friday?", 42, 63, "qqq-above-500-by-friday"),
  stocks("Will META close above $700 before next earnings?", 45, 61, "meta-above-700-before-earnings"),
  stocks("Will COIN outperform BTC over the next 30 days?", 40, 58, "coin-outperform-btc-next-30-days"),

  crypto("Will Bitcoin trade above $120,000 by the end of Q3?", 49, 71, "bitcoin-above-120k-by-q3"),
  crypto("Will Ethereum trade above $5,000 before quarter end?", 43, 68, "ethereum-above-5000-before-quarter-end"),
  crypto("Will Solana trade above $250 by the end of next month?", 46, 64, "solana-above-250-end-next-month"),
  crypto("Will Dogecoin trade above $0.25 this month?", 31, 55, "dogecoin-above-25-cents-this-month"),
  crypto("Will Bitcoin dominance close above 60% this month?", 52, 62, "bitcoin-dominance-above-60-this-month"),
  crypto("Will ETH/BTC rise over the next 14 days?", 48, 60, "eth-btc-rise-next-14-days"),
  crypto("Will Coinbase app ranking enter the top 10 finance apps this month?", 29, 47, "coinbase-top-10-finance-app-this-month"),
  crypto("Will stablecoin market cap grow over the next 30 days?", 59, 66, "stablecoin-market-cap-grow-next-30-days"),

  politics("Will a federal AI safety bill pass the House this session?", 36, 44, "federal-ai-safety-bill-passes-house"),
  politics("Will Congress pass a continuing resolution before the next shutdown deadline?", 62, 58, "congress-pass-cr-before-shutdown-deadline"),
  politics("Will the Senate hold a vote on a major stablecoin bill this session?", 55, 52, "senate-vote-major-stablecoin-bill"),
  politics("Will a major party presidential approval polling average finish above 45% this month?", 41, 46, "presidential-approval-average-above-45-this-month"),
  politics("Will FEC quarterly filings show more than $100M raised by the leading committee?", 48, 50, "fec-leading-committee-raises-100m-quarter"),
  politics("Will the House pass a major budget package before recess?", 39, 48, "house-pass-budget-package-before-recess"),
  politics("Will a Supreme Court decision on a major tech case be released this term?", 58, 54, "supreme-court-tech-case-decision-this-term"),
  politics("Will Congress.gov show final passage for a named AI-related bill this year?", 33, 43, "congress-final-passage-ai-related-bill-this-year"),

  entertainment("Will the next major Marvel release open above $100M domestically?", 46, 50, "marvel-release-open-above-100m"),
  entertainment("Will a Netflix original enter the weekly global top 3 this month?", 57, 49, "netflix-original-global-top-three-this-month"),
  entertainment("Will a major music tour announcement trend globally this week?", 44, 42, "major-tour-announcement-trend-this-week"),
  entertainment("Will a video game trailer exceed 50M views in its first week?", 38, 45, "game-trailer-exceed-50m-first-week"),
  entertainment("Will a new album debut at number 1 on the Billboard 200?", 52, 48, "new-album-debut-number-one-billboard-200"),
  entertainment("Will a major streaming film receive above 80% critic score at launch?", 35, 41, "streaming-film-above-80-critic-score"),
];

function sports(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "sports", probability, confidence, slug, "The Odds API + official league scores", "Official league result feed");
}

function weather(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "weather", probability, confidence, slug, "NOAA/NWS + Open-Meteo", "NOAA observed station data");
}

function economics(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "economics", probability, confidence, slug, "FRED + BLS + BEA + Census", "Official economic release");
}

function stocks(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "stocks", probability, confidence, slug, "FMP + SEC EDGAR + Stooq fallback", "Official closing market data");
}

function crypto(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "crypto", probability, confidence, slug, "CoinGecko", "CoinGecko market data");
}

function politics(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "politics", probability, confidence, slug, "FEC + Congress.gov + GDELT", "Official government record");
}

function entertainment(title: string, probability: number, confidence: number, slug: string): EventDef {
  return event(title, "entertainment", probability, confidence, slug, "TMDB + GDELT watchlist signals", "Public release and media data");
}

function event(
  title: string,
  category: PredictionEvent["category"],
  probability: number,
  confidence: number,
  slug: string,
  provider: string,
  resolutionSource: string,
): EventDef {
  const index = eventIndexCounter.next();
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    slug,
    title,
    category,
    probability,
    confidence,
    provider,
    resolutionSource,
    resolutionRule: defaultRule(title, category, resolutionSource),
    description: descriptionFor(category, provider),
    closesInDays: 5 + (index % 28),
  };
}

function seededWave(base: number, index: number, phase: number) {
  return clamp(base + Math.sin((index + phase) / 2.4) * 5 + Math.cos((index + phase) / 5.5) * 3, 5, 95);
}

export function seedEvents(): PredictionEvent[] {
  return EVENT_DEFS.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    status: "open",
    description: event.description,
    resolutionSource: event.resolutionSource,
    resolutionRule: event.resolutionRule,
    closesAt: daysFromNow(event.closesInDays ?? 14),
    resolvesAt: daysFromNow((event.closesInDays ?? 14) + 1),
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
      lastUpdatedAt: liveUpdatedAt(event.id),
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
    return Array.from({ length: 32 }).map((_, index) => {
      const probability = seededWave(event.probability, index, eventIndex * 3);
      const isLatest = index === 31;
      return {
        id: `snap_${event.id}_${index}`,
        eventId: event.id,
        probability: Number((isLatest ? liveProbability(probability, eventIndex) : probability).toFixed(2)),
        confidence: clamp(event.confidence - (index < 4 ? 4 : 0), 20, 95),
        sourceCount: event.confidence < 50 ? 2 : 4,
        dataFreshnessMinutes: isLatest ? liveFreshnessMinutes(eventIndex) : 18 + eventIndex * 3,
        explanation: explanationFor(event.category, probability),
        riskNotes: riskFor(event.category),
        createdAt: isLatest ? liveUpdatedAt(event.id) : daysAgo(31 - index),
      };
    });
  });
}

export function seedBars(): MarketPriceBar[] {
  return seedSnapshots().map((snapshot, index) => ({
    id: `bar_${snapshot.id}`,
    eventId: snapshot.eventId,
    time: snapshot.createdAt,
    probability: snapshot.probability,
    volume: Math.round(2000 + snapshot.probability * 120 + Math.sin(snapshot.probability + index) * 800),
  }));
}

export function eventDefinitions() {
  return EVENT_DEFS;
}

function liveProbability(base: number, index: number) {
  const minute = Math.floor(Date.now() / 60000);
  return clamp(base + Math.sin((minute + index * 17) / 3.2) * 2.8 + Math.cos((minute + index) / 8) * 1.3, 4, 96);
}

function liveFreshnessMinutes(index: number) {
  return 1 + ((Math.floor(Date.now() / 60000) + index) % 12);
}

function liveUpdatedAt(seed: string) {
  const offset = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 420;
  return new Date(Date.now() - offset * 1000).toISOString();
}

function providerUrl(provider: string) {
  if (provider.includes("Odds")) return "https://api.the-odds-api.com/docs";
  if (provider.includes("NOAA")) return "https://www.weather.gov/documentation/services-web-api";
  if (provider.includes("Open-Meteo")) return "https://open-meteo.com/";
  if (provider.includes("FRED")) return "https://fred.stlouisfed.org/docs/api/fred/";
  if (provider.includes("BLS")) return "https://www.bls.gov/developers/";
  if (provider.includes("FMP")) return "https://site.financialmodelingprep.com/developer/docs";
  if (provider.includes("SEC")) return "https://www.sec.gov/search-filings/edgar-application-programming-interfaces";
  if (provider.includes("CoinGecko")) return "https://www.coingecko.com/en/api";
  if (provider.includes("Congress")) return "https://api.congress.gov/";
  if (provider.includes("FEC")) return "https://api.open.fec.gov/developers/";
  if (provider.includes("GDELT")) return "https://www.gdeltproject.org/";
  if (provider.includes("TMDB")) return "https://developer.themoviedb.org/docs";
  return "/data-sources";
}

function descriptionFor(category: PredictionEvent["category"], provider: string) {
  const map: Record<PredictionEvent["category"], string> = {
    sports: `Specific matchup market generated from ${provider}, form, and official result data.`,
    weather: `Specific location/weather threshold generated from ${provider} forecast and observed data.`,
    economics: `Specific macro release market generated from official release calendars, consensus, and historical surprises.`,
    stocks: `Specific equity threshold market generated from market data, volatility, filings, and catalyst history.`,
    crypto: `Specific crypto threshold market generated from live market data, volatility, and breakout history.`,
    politics: `Specific government/political process market generated from official records and news momentum.`,
    entertainment: `Specific media/watchlist market generated from release, ranking, and public attention signals.`,
  };
  return map[category];
}

function defaultRule(title: string, category: PredictionEvent["category"], source: string) {
  const prefix = `YES resolves if "${title.replace("Will ", "")}" is confirmed by ${source}.`;
  const notes: Record<PredictionEvent["category"], string> = {
    sports: "Official final scores control settlement.",
    weather: "Official observed station or forecast source controls settlement.",
    economics: "Initial official release controls unless the event states revisions count.",
    stocks: "Split-adjusted official closing data controls settlement.",
    crypto: "Reference spot market data controls settlement.",
    politics: "Official government records control settlement.",
    entertainment: "Public ranking, release, or media-source data controls settlement.",
  };
  return `${prefix} ${notes[category]}`;
}

function explanationFor(category: PredictionEvent["category"], probability: number) {
  const direction = probability >= 50 ? "supportive" : "cautious";
  const map: Record<PredictionEvent["category"], string> = {
    sports: `Market-implied probability is ${direction}, with form and injury adjustments included.`,
    weather: `Forecast model blend is ${direction}, with climatology and recent trend blended in.`,
    economics: `Consensus and historical surprise data produce a ${direction} macro read.`,
    stocks: `Price action, volatility, and catalyst history create a ${direction} threshold setup.`,
    crypto: `Crypto momentum and volatility history create a ${direction} breakout read.`,
    politics: `Official data and news momentum remain ${direction}, with lower source confidence.`,
    entertainment: `Media trend and release-calendar signals are ${direction}.`,
  };
  return map[category];
}

function riskFor(category: PredictionEvent["category"]) {
  const map: Record<PredictionEvent["category"], string> = {
    sports: "Late injuries, lineup news, and schedule changes can move the probability quickly.",
    weather: "Forecast model spread can be wide until the event window is closer.",
    economics: "Consensus can shift before release and revisions may change interpretation.",
    stocks: "Volatility and earnings/news catalysts can invalidate technical signals.",
    crypto: "High volatility and weekend liquidity can cause large probability swings.",
    politics: "Official action may be delayed and news sentiment can be noisy.",
    entertainment: "Data quality is weaker; use this as a watchlist signal only.",
  };
  return map[category];
}
