import Link from "next/link";
import { ArrowRight, Database, LineChart, ShieldCheck, Sparkles, User, WalletCards } from "lucide-react";
import { LandingMotion } from "@/components/LandingMotion";
import { WaitlistForm } from "@/components/WaitlistForm";
import { buildLiveEventFeed } from "@/lib/live-event-feed";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const feed = await buildLiveEventFeed();
  const events = feed.events.slice(0, 3);

  return (
    <main className="landing andromeda-landing">
      <LandingMotion />
      <nav className="landing-nav glass-nav">
        <Link href="/" className="wordmark">
          <span>Andromeda</span>
          <i />
        </Link>
        <div className="nav-center">
          <a href="#features">Features</a>
          <Link href="/events">Markets</Link>
          <a href="#mission">Mission</a>
          <Link href="/data-sources">Sources</Link>
        </div>
        <div className="nav-icons">
          <Link href="/dashboard" aria-label="Launch terminal"><Sparkles size={20} /></Link>
          <Link href="/auth" aria-label="Account"><User size={20} /></Link>
        </div>
      </nav>

      <section className="galaxy-hero" data-motion>
        <video className="hero-video" autoPlay muted loop playsInline poster="/andromeda-galaxy.png">
          <source src="/assets/galaxy-bg.mp4" type="video/mp4" />
        </video>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <h1>
            <span>Don&apos;t Guess.</span>
            Make Smart Paper Trades.
          </h1>
          <p>AI-assisted prediction market analysis for sports, weather, macro, stocks, crypto, and politics. Paper-only until the edge is proven.</p>
          <div className="hero-actions center-actions">
            <Link className="purple-button" href="/dashboard">Launch terminal</Link>
            <Link className="ghost-button" href="/events">Browse markets</Link>
            <Link className="ghost-button" href="/risk">Risk disclaimer</Link>
          </div>
        </div>
      </section>

      <section id="features" className="product-band strategy-band" data-motion>
        <div className="copy-block">
          <span className="violet-kicker">Strategy builder</span>
          <h2>Generate a paper algorithm from your market view</h2>
          <p>Tell Scout which event to target and what you think the true probability is. It turns that view into entry rules, exit rules, sizing, and a backtest-ready strategy.</p>
          <ul className="terminal-list">
            <li>Generate a strategy for any Andromeda event</li>
            <li>Automatic edge and sizing calculation</li>
            <li>Save rules directly to your strategy library</li>
          </ul>
        </div>
        <div className="andro-card">
          <div className="card-corners" />
          <div className="andro-card-head">
            <strong>ANDRO</strong>
            <span>AI strategy generator</span>
          </div>
          <div className="prompt-bubble">Generate a paper strategy for the Fed CPI event. Market is 41%, but I think true odds are closer to 52%.</div>
          <div className="response-block">Strategy generated. Model probability: 52% vs market 41% = +11% edge. Entry at 45c or lower; exit above 61c or 7 days before expiry.</div>
          <div className="response-block">Sizing: 6.4% of paper bankroll. Backtest: 64% win rate over stored probability history.</div>
        </div>
      </section>

      <section className="product-band reverse-band" data-motion>
        <div className="mock-chart-card">
          <div className="card-corners" />
          <div className="mock-chart-head">
            <strong>Fed Cuts Rates in 2026?</strong>
            <span><b className="red-dot" /> June 38%</span>
            <span><b className="blue-dot" /> September 32%</span>
            <span><b className="green-dot" /> December 22%</span>
          </div>
          <div className="mock-grid-chart">
            <i className="line-red" />
            <i className="line-blue" />
            <i className="line-green" />
            <div className="crosshair-line" />
            <div className="tooltip-card">
              <span>Feb</span>
              <b>June: 30.2%</b>
              <b>Sept: 28.1%</b>
              <b>Dec: 20.9%</b>
            </div>
          </div>
        </div>
        <div className="copy-block">
          <span className="violet-kicker">Backtesting</span>
          <h2>Test against real probability history</h2>
          <p>Run strategies against stored Andromeda snapshots with walk-forward validation. See win rate, drawdown, hold time, and trade-by-trade performance before you paper trade.</p>
          <ul className="terminal-list">
            <li>No future data leakage</li>
            <li>Category and source-divergence filters</li>
            <li>Win rate, drawdown, and P&L metrics</li>
          </ul>
        </div>
      </section>

      <section className="product-band paper-band" data-motion>
        <div className="copy-block">
          <span className="violet-kicker">Paper trading</span>
          <h2>Simulate before you risk anything</h2>
          <p>Trade YES/NO with fake capital, track open positions, refresh the ledger, and reward users for useful model feedback. V1 has no real-money execution.</p>
          <ul className="terminal-list">
            <li>$10,000 paper account on onboarding</li>
            <li>Real-time portfolio and ledger tracking</li>
            <li>Rewards for backtests, trades, and feedback</li>
          </ul>
        </div>
        <div className="portfolio-preview">
          <div className="card-corners" />
          <div className="portfolio-head">
            <strong>Paper Portfolio</strong>
            <span>$12,340 <b>+23.4%</b></span>
          </div>
          {events.map((event, index) => (
            <article key={event.id}>
              <span>{event.category}</span>
              <strong>{event.title}</strong>
              <div className="prob-track"><span style={{ width: `${event.latest.probability}%` }} /></div>
              <b>{event.latest.probability.toFixed(1)}%</b>
            </article>
          ))}
        </div>
      </section>

      <section id="mission" className="mission-band" data-motion>
        <h2>With Andromeda, every signal is backed by tested data, paper traded, and sized with precision, so you trade with <span>an edge, not a hunch.</span></h2>
        <div className="mission-actions">
          <Link className="purple-button" href="/auth">Get started <ArrowRight size={18} /></Link>
          <WaitlistForm />
        </div>
      </section>

      <section className="feature-band final-feature-band" data-motion>
        <article><Database /><strong>Own event database</strong><p>External APIs feed normalized Andromeda events, not cash market execution.</p></article>
        <article><WalletCards /><strong>Paper trading</strong><p>YES/NO simulation, ledger, P&L, and settlement notifications.</p></article>
        <article><LineChart /><strong>TradingView-style charts</strong><p>Probability history and terminal charts built with Lightweight Charts.</p></article>
        <article><ShieldCheck /><strong>Transparent confidence</strong><p>Every probability shows source count, freshness, and confidence.</p></article>
      </section>
    </main>
  );
}
