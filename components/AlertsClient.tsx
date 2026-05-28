"use client";

import { useEffect, useState } from "react";
import type { store } from "@/lib/demo-store";

type EventWithLatest = ReturnType<typeof store.listEvents>[number];

export function AlertsClient({ events }: { events: EventWithLatest[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [probability, setProbability] = useState(60);
  const [alerts, setAlerts] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/alerts");
    const data = await res.json();
    setAlerts(data.alerts);
  }

  async function create() {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, condition, probability }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="split">
      <section className="panel">
        <div className="section-heading"><span>Alerts</span><h2>Create probability alert</h2></div>
        <label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
        <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value as "above" | "below")}><option value="above">Above</option><option value="below">Below</option></select></label>
        <label>Probability<input type="number" min={1} max={99} value={probability} onChange={(event) => setProbability(Number(event.target.value))} /></label>
        <button className="primary-button" onClick={create}>Create alert</button>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Active</span><h2>Your alerts</h2></div>
        <div className="card-list">
          {alerts.length === 0 ? <p className="muted">No active alerts.</p> : alerts.map((alert) => (
            <article className="mini-card" key={alert.id}>
              <strong>{alert.event?.title}</strong>
              <p>{alert.condition} {alert.probability}%</p>
              <button onClick={() => remove(alert.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
