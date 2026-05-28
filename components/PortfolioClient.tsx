"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/client-api";

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
  const [trades, setTrades] = useState<any[]>([]);

  async function load() {
    const [portfolioRes, tradesRes] = await Promise.all([
      authenticatedFetch("/api/paper/portfolio", { cache: "no-store" }),
      authenticatedFetch("/api/paper/trades", { cache: "no-store" }),
    ]);
    setPortfolio(await portfolioRes.json());
    const tradeData = await tradesRes.json();
    setTrades(tradeData.trades ?? []);
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
      <section className="panel">
        <div className="section-heading"><span>Ledger</span><h2>Recent paper trades</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Event</th><th>Action</th><th>Side</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>{trades.length === 0 ? (
              <tr><td colSpan={6}>No trades yet. Open an event and place a paper order.</td></tr>
            ) : trades.map((trade) => (
              <tr key={trade.id}>
                <td>{new Date(trade.createdAt).toLocaleString()}</td>
                <td>{trade.event?.title}</td>
                <td>{trade.action}</td>
                <td>{trade.side}</td>
                <td>{trade.quantity}</td>
                <td>{(trade.price * 100).toFixed(1)}c</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
