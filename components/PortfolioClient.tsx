"use client";

import { useEffect, useState } from "react";

type Portfolio = {
  account: { cash: number; startingCash: number };
  totalValue: number;
  paperReturnPct: number;
  positions: Array<{
    id: string;
    side: string;
    quantity: number;
    avgPrice: number;
    mark: number;
    value: number;
    unrealizedPnl: number;
    event: { title: string; category: string };
  }>;
};

export function PortfolioClient() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  async function load() {
    const res = await fetch("/api/paper/portfolio", { cache: "no-store" });
    setPortfolio(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  if (!portfolio) return <div className="panel">Loading portfolio...</div>;

  return (
    <div className="stack">
      <div className="metric-grid">
        <article className="metric-card"><span>Portfolio value</span><strong>${portfolio.totalValue.toFixed(2)}</strong></article>
        <article className="metric-card"><span>Cash</span><strong>${portfolio.account.cash.toFixed(2)}</strong></article>
        <article className="metric-card"><span>Paper return</span><strong>{portfolio.paperReturnPct.toFixed(2)}%</strong></article>
      </div>
      <section className="panel">
        <div className="section-heading"><span>Open positions</span><h2>Marked to Andromeda probability</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Side</th><th>Qty</th><th>Avg</th><th>Mark</th><th>P&L</th></tr></thead>
            <tbody>
              {portfolio.positions.length === 0 ? (
                <tr><td colSpan={6}>No open paper positions yet.</td></tr>
              ) : portfolio.positions.map((position) => (
                <tr key={position.id}>
                  <td>{position.event.title}</td>
                  <td>{position.side.toUpperCase()}</td>
                  <td>{position.quantity}</td>
                  <td>{(position.avgPrice * 100).toFixed(1)}c</td>
                  <td>{(position.mark * 100).toFixed(1)}c</td>
                  <td className={position.unrealizedPnl >= 0 ? "positive" : "negative"}>${position.unrealizedPnl.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
