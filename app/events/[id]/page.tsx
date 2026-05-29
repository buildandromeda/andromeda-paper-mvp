import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { PaperOrderTicket } from "@/components/PaperOrderTicket";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { store } from "@/lib/demo-store";
import type { CatalogEvent } from "@/lib/event-catalog";
import { getLiveEvent } from "@/lib/live-event-feed";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event: CatalogEvent | null = await getLiveEvent(id);
  let history = event?.history ?? [];
  let sources = event?.sources ?? [];

  if (!event && canUseSupabaseStore()) {
    try {
      const databaseEvent = await supabaseStore.getEvent(id);
      if (databaseEvent) {
        event = databaseEvent;
        history = await supabaseStore.history(databaseEvent.id);
        sources = await supabaseStore.sources(databaseEvent.id);
      }
    } catch {
      // Keep demo event data if Supabase is temporarily unavailable.
    }
  }

  if (!event) {
    event = store.getEvent(id);
    history = event ? store.history(event.id) : [];
    sources = event ? store.sources(event.id) : [];
  }

  if (!event) notFound();

  return (
    <AppShell>
      <div className="page-heading">
        <span>{event.category}</span>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
      </div>
      <div className="split">
        <section className="panel">
          <div className="section-heading">
            <span>Probability</span>
            <h2>{event.latest.probability.toFixed(1)}%</h2>
          </div>
          <ConfidenceBadge confidence={event.latest.confidence} sourceCount={event.latest.sourceCount} freshness={event.latest.dataFreshnessMinutes} />
          <ProbabilityChart history={history} />
          <p className="muted">{event.latest.explanation}</p>
          <p className="muted">Risk: {event.latest.riskNotes}</p>
          {event.latest.calculation && (
            <div className="calculation-panel">
              <strong>Exact calculation</strong>
              <p>{event.latest.calculation.formula}</p>
              <div className="calculation-grid">
                {event.latest.calculation.inputs.map((input) => (
                  <span key={input.label}><b>{input.label}</b>{input.value}</span>
                ))}
              </div>
              <a href={event.latest.calculation.sourceUrl} target="_blank" rel="noreferrer">Open source feed</a>
            </div>
          )}
        </section>
        <PaperOrderTicket event={event} />
      </div>
      <section className="panel">
        <div className="section-heading"><span>Resolution</span><h2>How this settles</h2></div>
        <p>{event.resolutionRule}</p>
        <p className="muted">Source of truth: {event.resolutionSource}</p>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Sources</span><h2>Data transparency</h2></div>
        <div className="card-list">
          {sources.map((source) => (
            <article className="mini-card" key={source.id}>
              <strong>{source.label}</strong>
              <p>{source.provider} - {source.status} - last updated {new Date(source.lastUpdatedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
