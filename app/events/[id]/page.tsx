import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { PaperOrderTicket } from "@/components/PaperOrderTicket";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = store.getEvent(id);
  if (!event) notFound();
  const history = store.history(event.id);
  const sources = store.sources(event.id);

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
              <p>{source.provider} · {source.status} · last updated {new Date(source.lastUpdatedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
