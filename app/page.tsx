import Link from "next/link";
import { ArrowRight, Database, LineChart, ShieldCheck, WalletCards } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";
import { store } from "@/lib/demo-store";

export default function LandingPage() {
  const events = store.listEvents().slice(0, 3);
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand-lockup">
          <div className="brand-mark">A</div>
          <div><span>Andromeda</span><strong>Paper MVP</strong></div>
        </Link>
        <div>
          <Link href="/dashboard">Open demo</Link>
          <Link href="/data-sources">How it works</Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="kicker">Paper mode only · no real-money execution</span>
          <h1>Prediction-market intelligence before you risk a dollar.</h1>
          <p>
            Andromeda turns sports, weather, macro, stocks, crypto, and politics data into transparent event probabilities,
            paper trades, backtests, and model feedback loops.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/dashboard">Launch terminal <ArrowRight size={17} /></Link>
            <Link className="secondary-link" href="/risk">Read risk disclaimer</Link>
          </div>
          <WaitlistForm />
        </div>
        <div className="terminal-preview">
          {events.map((event) => (
            <article key={event.id}>
              <span>{event.category}</span>
              <strong>{event.title}</strong>
              <div className="prob-row">
                <b>{event.latest.probability.toFixed(1)}%</b>
                <div className="prob-track"><span style={{ width: `${event.latest.probability}%` }} /></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <article><Database /><strong>Own event database</strong><p>External APIs feed normalized Andromeda events, not user-created cash markets.</p></article>
        <article><WalletCards /><strong>Paper trading</strong><p>Buy/sell YES or NO with fake capital, ledger, P&L, and settlement notifications.</p></article>
        <article><LineChart /><strong>Backtesting</strong><p>Test probability rules against stored probability history before saving strategies.</p></article>
        <article><ShieldCheck /><strong>Transparent confidence</strong><p>Every probability shows source count, freshness, and confidence band.</p></article>
      </section>
    </main>
  );
}
