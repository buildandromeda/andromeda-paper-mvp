import Link from "next/link";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { store } from "@/lib/demo-store";

type EventWithLatest = ReturnType<typeof store.listEvents>[number];

export function EventCard({ event }: { event: EventWithLatest }) {
  return (
    <Link href={`/events/${event.slug}`} className="event-card">
      <div className="event-card-top">
        <span className={`category category-${event.category}`}>{event.category}</span>
        <ConfidenceBadge
          confidence={event.latest.confidence}
          sourceCount={event.latest.sourceCount}
          freshness={event.latest.dataFreshnessMinutes}
        />
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="prob-row">
        <strong>{event.latest.probability.toFixed(1)}%</strong>
        <div className="prob-track">
          <span style={{ width: `${event.latest.probability}%` }} />
        </div>
      </div>
      <small>Resolves from {event.resolutionSource}</small>
    </Link>
  );
}
