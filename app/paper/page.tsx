import { AppShell } from "@/components/AppShell";
import { PortfolioClient } from "@/components/PortfolioClient";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function PaperPage() {
  const trades = store.trades("demo-user");
  return (
    <AppShell>
      <div className="page-heading">
        <span>Paper portfolio</span>
        <h1>Simulated trading account</h1>
        <p>Every onboarded user starts with $10,000 fake capital. No real money, no broker execution.</p>
      </div>
      <PortfolioClient />
      <section className="panel">
        <div className="section-heading"><span>Ledger</span><h2>Recent paper trades</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Event</th><th>Action</th><th>Side</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>{trades.length === 0 ? <tr><td colSpan={6}>No trades yet. Open an event and place a paper order.</td></tr> : trades.map((trade) => <tr key={trade.id}><td>{new Date(trade.createdAt).toLocaleString()}</td><td>{trade.event?.title}</td><td>{trade.action}</td><td>{trade.side}</td><td>{trade.quantity}</td><td>{(trade.price * 100).toFixed(1)}c</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
