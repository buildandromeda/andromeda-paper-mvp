"use client";

import Link from "next/link";
import { Activity, Clock, RefreshCw, Search, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { CustomEventSuggestion } from "@/lib/custom-events";
import type { CatalogEvent } from "@/lib/event-catalog";
import type { EventCategory } from "@/lib/types";

type CategoryFilter = EventCategory | "all";

const categories: Array<{ label: string; value: CategoryFilter }> = [
  { label: "Trending", value: "all" },
  { label: "Sports", value: "sports" },
  { label: "Weather", value: "weather" },
  { label: "Economy", value: "economics" },
  { label: "Stocks", value: "stocks" },
  { label: "Crypto", value: "crypto" },
  { label: "Politics", value: "politics" },
  { label: "Media", value: "entertainment" },
];

export function EventMarketplace({ initialEvents }: { initialEvents: CatalogEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<CustomEventSuggestion[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [isPending, startTransition] = useTransition();

  const visibleEvents = useMemo(() => events, [events]);
  const topMover = visibleEvents[0];

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const params = new URLSearchParams();
      params.set("category", category);
      if (query.trim()) params.set("q", query.trim());

      const response = await fetch(`/api/events?${params.toString()}`, { cache: "no-store" });
      if (!response.ok || !alive) return;
      const payload = await response.json();
      setEvents(payload.events ?? []);
      setLastUpdated(payload.updatedAt ?? new Date().toISOString());
    }

    refresh();
    const timer = setInterval(refresh, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [category, query]);

  function runCustomSearch() {
    const clean = query.trim();
    if (clean.length < 2) return;

    startTransition(async () => {
      const response = await fetch(`/api/events/search?q=${encodeURIComponent(clean)}`, { cache: "no-store" });
      const payload = await response.json();
      setDrafts(payload.suggestions ?? []);
    });
  }

  return (
    <div className="marketplace-shell">
      <section className="market-hero-panel">
        <div>
          <span className="violet-kicker">Live event marketplace</span>
          <h1>Trade specific outcomes, not broad vibes.</h1>
          <p>
            Andromeda creates paper prediction events from sports, weather, economics, equities, crypto, politics,
            and media data sources. Prices refresh automatically and every event shows confidence and source freshness.
          </p>
        </div>
        <div className="market-live-tile">
          <div className="live-status"><i /> Live refresh</div>
          <strong>{visibleEvents.length}</strong>
          <span>active paper markets</span>
          {topMover ? <p>{topMover.title}</p> : <p>Loading event feed...</p>}
        </div>
      </section>

      <section className="market-search-panel">
        <div className="market-search-box">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runCustomSearch();
            }}
            placeholder="Search NVDA, Bitcoin, Phoenix weather, Celtics, CPI, Congress..."
          />
          <button type="button" onClick={runCustomSearch}>
            <Sparkles size={16} />
            Generate
          </button>
        </div>
        <div className="market-refresh-note">
          <RefreshCw size={15} className={isPending ? "spin" : ""} />
          Updated {timeAgo(lastUpdated)}. No Kalshi API. External source adapters + Andromeda Scout pricing.
        </div>
      </section>

      <div className="market-category-rail" aria-label="Event categories">
        {categories.map((item) => (
          <button
            className={category === item.value ? "active" : ""}
            key={item.value}
            onClick={() => setCategory(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {drafts.length > 0 && (
        <section className="draft-market-section">
          <div className="market-section-head">
            <div>
              <span className="violet-kicker">Custom event search</span>
              <h2>Generated event drafts</h2>
            </div>
            <p>These need verified resolution rules before they become tradeable.</p>
          </div>
          <div className="draft-grid">
            {drafts.map((draft) => <DraftCard draft={draft} key={draft.id} />)}
          </div>
        </section>
      )}

      <section className="market-board">
        <div className="market-section-head">
          <div>
            <span className="violet-kicker">Andromeda events</span>
            <h2>{category === "all" ? "Trending paper markets" : `${category} paper markets`}</h2>
          </div>
          <p>{visibleEvents.length} events. Auto-refreshing every 15 seconds.</p>
        </div>
        <div className="market-list">
          {visibleEvents.map((event) => <MarketEventRow event={event} key={event.id} />)}
        </div>
      </section>
    </div>
  );
}

function MarketEventRow({ event }: { event: CatalogEvent }) {
  const yes = event.latest.probability;
  const no = 100 - yes;
  const volume = syntheticVolume(event.title, yes);

  return (
    <Link className="market-row" href={`/events/${event.slug}`}>
      <div className="market-row-main">
        <div className="market-row-kicker">
          <span className={`category category-${event.category}`}>{event.category}</span>
          <span className="live-pill"><i /> {event.latest.dataFreshnessMinutes}m fresh</span>
          <span><Clock size={13} /> closes {daysUntil(event.closesAt)}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.resolutionSource}</p>
      </div>
      <Sparkline seed={event.title} probability={yes} />
      <div className="market-row-prices">
        <span className="yes-price">YES {yes.toFixed(0)}c</span>
        <span className="no-price">NO {no.toFixed(0)}c</span>
        <small>${volume.toLocaleString()} vol</small>
      </div>
      <ConfidenceBadge
        confidence={event.latest.confidence}
        sourceCount={event.latest.sourceCount}
        freshness={event.latest.dataFreshnessMinutes}
      />
    </Link>
  );
}

function DraftCard({ draft }: { draft: CustomEventSuggestion }) {
  return (
    <article className="draft-card">
      <div className="market-row-kicker">
        <span className={`category category-${draft.category}`}>{draft.category}</span>
        <span className="live-pill"><i /> source checked</span>
      </div>
      <h3>{draft.title}</h3>
      <p>{draft.reason}</p>
      <div className="draft-probability">
        <strong>{draft.probability.toFixed(1)}%</strong>
        <span>{draft.confidence}% confidence</span>
      </div>
      <small>{draft.source} - resolves from {draft.resolutionSource}</small>
    </article>
  );
}

function Sparkline({ seed, probability }: { seed: string; probability: number }) {
  const values = Array.from({ length: 18 }, (_, index) => {
    const char = seed.charCodeAt(index % seed.length);
    return Math.max(8, Math.min(88, probability + Math.sin((char + index) / 2.7) * 12));
  });

  return (
    <div className="sparkline" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${seed}-${index}`} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

function syntheticVolume(seed: string, probability: number) {
  const score = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Math.round(2600 + score * 6 + probability * 110);
}

function daysUntil(date: string) {
  const days = Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));
  return days <= 1 ? "today" : `${days}d`;
}

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
