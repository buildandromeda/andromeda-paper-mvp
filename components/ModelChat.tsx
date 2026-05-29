"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/client-api";
import type { CatalogEvent } from "@/lib/event-catalog";

type EventWithLatest = CatalogEvent;

export function ModelChat({ events }: { events: EventWithLatest[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [prompt, setPrompt] = useState("Generate a cautious paper strategy for this event and explain the risk.");
  const [run, setRun] = useState<any>(null);
  const [note, setNote] = useState("");

  async function analyze() {
    const res = await authenticatedFetch("/api/model/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, prompt }),
    });
    const data = await res.json();
    setRun(data.run);
  }

  async function sendFeedback(helpful: boolean) {
    if (!run) return;
    await authenticatedFetch("/api/model/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelRunId: run.id, helpful, note }),
    });
    setNote(helpful ? "Feedback stored: helpful + points awarded." : "Feedback stored: needs work + points awarded.");
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="section-heading"><span>Andromeda Scout v0.1</span><h2>Grounded model research</h2></div>
        <label>Event<select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
        <label>Prompt<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} /></label>
        <button className="primary-button" onClick={analyze}>Ask Scout</button>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Response</span><h2>Scope-limited answer</h2></div>
        {!run ? <p className="muted">Scout answers event questions, portfolio questions, strategy generation, backtest explanation, and event comparisons only.</p> : (
          <>
            <div className="model-answer">
              <strong>Confidence {Math.round(run.confidence)}%</strong>
              <p>{run.answer}</p>
            </div>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional feedback note" />
            <div className="button-row">
              <button onClick={() => sendFeedback(true)}>Helpful +15</button>
              <button onClick={() => sendFeedback(false)}>Needs work +15</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
