import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const events = store.listEvents();
  const portfolio = store.portfolio("demo-user");
  const leaderboard = store.leaderboard().slice(0, 3);

  return (
    <AppShell>
      <div className="page-heading">
        <span>Paper MVP</span>
        <h1>Andromeda terminal</h1>
        <p>Transparent probabilities, paper trading, strategy tests, and model feedback in one launchable workspace.</p>
      </div>

      <div className="metric-grid">
        <article className="metric-card"><span>Events tracked</span><strong>{events.length}</strong></article>
        <article className="metric-card"><span>Portfolio value</span><strong>${portfolio.totalValue.toFixed(2)}</strong></article>
        <article className="metric-card"><span>Paper return</span><strong>{portfolio.paperReturnPct.toFixed(2)}%</strong></article>
        <article className="metric-card"><span>Top score</span><strong>{leaderboard[0]?.totalScore.toFixed(1)}</strong></article>
      </div>

      <section className="panel">
        <div className="section-heading">
          <span>Featured events</span>
          <h2>Andromeda-owned prediction database</h2>
        </div>
        <div className="event-grid">
          {events.slice(0, 6).map((event) => <EventCard event={event} key={event.id} />)}
        </div>
      </section>

      <section className="split">
        <div className="panel">
          <div className="section-heading"><span>Next actions</span><h2>Launch checklist</h2></div>
          <ul className="check-list">
            <li>Rotate old Kalshi keys from the exported zip.</li>
            <li>Create staging and production Supabase projects.</li>
            <li>Run `supabase/migrations/001_initial_paper_mvp.sql`.</li>
            <li>Add Vercel environment variables from `.env.local.example`.</li>
          </ul>
        </div>
        <div className="panel">
          <div className="section-heading"><span>Leaderboard</span><h2>Risk-adjusted paper score</h2></div>
          <div className="card-list">
            {leaderboard.map((row) => (
              <Link className="leader-row" href="/leaderboard" key={row.userId}>
                <strong>#{row.rank} {row.displayName}</strong>
                <span>{row.totalScore.toFixed(1)} score · {row.paperReturnPct.toFixed(2)}%</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
