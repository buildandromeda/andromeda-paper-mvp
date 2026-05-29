"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/client-api";
import type { CatalogEvent } from "@/lib/event-catalog";

type EventWithLatest = CatalogEvent;

export function BacktestLab({ events }: { events: EventWithLatest[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [threshold, setThreshold] = useState(50);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function run() {
    if (!eventId) {
      setMessage("No event with enough provider history is available yet.");
      return;
    }
    setMessage("Running backtest...");
    const res = await authenticatedFetch("/api/backtests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        threshold,
        direction: "crosses_above",
        maxHoldPeriods: 6,
        stopLossPct: 20,
        takeProfitPct: 35,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error);
    else {
      setResult(data.backtest);
      setMessage("Backtest complete.");
    }
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="section-heading"><span>Backtest lab</span><h2>Probability rule test</h2></div>
        <label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.length === 0 && <option>No events with enough history</option>}{events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
        <label>Entry threshold<input type="number" min={1} max={99} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
        <button className="primary-button" onClick={run}>Run backtest</button>
        <p className="muted">{message || "Stock threshold events include delayed Stooq history now. Sports/weather events will backtest after historical provider snapshots accumulate."}</p>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Results</span><h2>Risk-adjusted output</h2></div>
        {!result ? <p className="muted">Run a backtest to see return, win rate, drawdown, and trade list.</p> : (
          <>
            <div className="metric-grid">
              <article className="metric-card"><span>Total return</span><strong>{result.totalReturnPct}%</strong></article>
              <article className="metric-card"><span>Win rate</span><strong>{result.winRate}%</strong></article>
              <article className="metric-card"><span>Max drawdown</span><strong>{result.maxDrawdownPct}%</strong></article>
              <article className="metric-card"><span>Trades</span><strong>{result.trades.length}</strong></article>
            </div>
            <p className="muted">{result.assumptions?.join(" ")}</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Entry</th><th>Exit</th><th>Entry</th><th>Exit</th><th>P&L</th></tr></thead>
                <tbody>{result.trades.map((trade: any, index: number) => <tr key={index}><td>{new Date(trade.entryTime).toLocaleDateString()}</td><td>{new Date(trade.exitTime).toLocaleDateString()}</td><td>{(trade.entryPrice * 100).toFixed(1)}c</td><td>{(trade.exitPrice * 100).toFixed(1)}c</td><td>${trade.pnl}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
