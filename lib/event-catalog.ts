import { store } from "@/lib/demo-store";
import type { EventCategory, EventSource, MarketPriceBar, PredictionEvent, ProbabilitySnapshot } from "@/lib/types";

export type CatalogEvent = PredictionEvent & {
  latest: ProbabilitySnapshot;
  sources: EventSource[];
  history?: ProbabilitySnapshot[];
  bars?: MarketPriceBar[];
};

export function catalogEvents(filters?: { category?: EventCategory | "all"; q?: string }) {
  return sortMarketplaceEvents(store.listEvents(filters));
}

export function mergeEventLists(databaseEvents: CatalogEvent[], bundledEvents: CatalogEvent[]) {
  const merged = new Map<string, CatalogEvent>();

  for (const event of bundledEvents) merged.set(event.id, event);
  for (const event of databaseEvents) merged.set(event.id, event);

  return sortMarketplaceEvents([...merged.values()]);
}

export function sortMarketplaceEvents(events: CatalogEvent[]) {
  return [...events].sort((a, b) => {
    const categoryWeight = categoryScore(b.category) - categoryScore(a.category);
    if (categoryWeight !== 0) return categoryWeight;

    const confidenceWeight = b.latest.confidence - a.latest.confidence;
    if (confidenceWeight !== 0) return confidenceWeight;

    return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
  });
}

export function categoryScore(category: EventCategory) {
  const weights: Record<EventCategory, number> = {
    sports: 7,
    economics: 6,
    stocks: 5,
    crypto: 4,
    weather: 3,
    politics: 2,
    entertainment: 1,
  };
  return weights[category];
}
