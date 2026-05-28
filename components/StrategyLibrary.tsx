"use client";

import { useEffect, useState } from "react";

export function StrategyLibrary() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [name, setName] = useState("Cross above 55% momentum");
  const [rule, setRule] = useState("Buy YES when probability crosses above 55% and confidence is above 60.");

  async function load() {
    const res = await fetch("/api/strategies");
    const data = await res.json();
    setStrategies(data.strategies);
  }

  async function save() {
    await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rule, description: "Saved from Strategy Library", eventCategory: "all" }),
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="split">
      <section className="panel">
        <div className="section-heading"><span>Strategy builder</span><h2>Save a paper rule</h2></div>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Rule<textarea value={rule} onChange={(event) => setRule(event.target.value)} rows={5} /></label>
        <button className="primary-button" onClick={save}>Save strategy +25</button>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Library</span><h2>Your saved strategies</h2></div>
        <div className="card-list">
          {strategies.length === 0 ? <p className="muted">No strategies saved yet.</p> : strategies.map((strategy) => (
            <article className="mini-card" key={strategy.id}>
              <strong>{strategy.name}</strong>
              <p>{strategy.rule}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
