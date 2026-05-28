"use client";

import { useState } from "react";
import type { store } from "@/lib/demo-store";

type EventWithLatest = ReturnType<typeof store.listEvents>[number];

export function BacktestLab({ events }: { events: EventWithLatest[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [threshold, setThreshold] = useState(50);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function run() {
    setMessage("Running backtest...");
    const res = await fetch("/api/backtests", {
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
        <label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
        <label>Entry threshold<input type="number" min={1} max={99} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
        <button className="primary-button" onClick={run}>Run backtest</button>
        <p className="muted">{message}</p>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Results</span><h2>Risk-adjusted output</h2></div>
        {!result ? <p className="muted">Run a backtest to see return, win rate, drawdown, and trade list.</p> : (
          <>
            <div className="metric-grid">
              <article className="metric-card"><span>Total return</span><strong>{result.totalReturnPct}%</strong></article>
              <article className="metric-card"><span>Win rate</span><strong>{result.winRate}%</strong></article>
              <article className="metric-card"><span>Max drawdown</span><strong>{result.maxDrawdownPct}%</strong></article>
            </div>
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
