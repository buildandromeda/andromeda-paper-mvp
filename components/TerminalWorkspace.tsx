"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Bot,
  Braces,
  ChartNoAxesCombined,
  Clock3,
  Crosshair,
  Layers,
  Maximize2,
  Search,
  Settings,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { store } from "@/lib/demo-store";
import { authenticatedFetch } from "@/lib/client-api";
import { TradingViewTerminalChart } from "@/components/TradingViewTerminalChart";

type EventWithLatest = ReturnType<typeof store.listEvents>[number];

export function TerminalWorkspace({ events }: { events: EventWithLatest[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const activeEvent = useMemo(
    () => events.find((event) => event.id === eventId) ?? events[0],
    [eventId, events],
  );

  async function quickOrder(side: "yes" | "no") {
    if (!activeEvent) return;
    setMessage("Submitting paper order...");
    const res = await authenticatedFetch("/api/paper/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: activeEvent.id, action: "buy", side, quantity: 1 }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.trade.note : data.error);
  }

  async function askScout() {
    if (!activeEvent || !prompt.trim()) return;
    setMessage("Scout is analyzing stored event data...");
    const res = await authenticatedFetch("/api/model/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: activeEvent.id, prompt }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.run.answer : data.error);
  }

  return (
    <div className="astral-terminal">
      <aside className="terminal-chat">
        <div className="terminal-chat-head">
          <strong>New Chat</strong>
          <div>
            <button aria-label="New prompt"><Sparkles size={18} /></button>
            <button aria-label="History"><Clock3 size={18} /></button>
          </div>
        </div>

        <section className="chat-welcome">
          <h2>Hey, I&apos;m Scout.</h2>
          <p>Ask me anything about the platform or a paper prediction market.</p>
        </section>

        <div className="prompt-stack">
          <button onClick={() => setPrompt("Build a 5-day YES strategy for this event using probability momentum and confidence filters.")}>
            <ChartNoAxesCombined size={19} />
            Build a 5-day strategy using probability momentum.
          </button>
          <button onClick={() => setPrompt("Create a custom indicator that flags stale data divergence and falling confidence.")}>
            <Braces size={19} />
            Create a custom stale-data divergence indicator.
          </button>
          <button onClick={() => setPrompt("Which event has the cleanest edge after source freshness and confidence?")}>
            <Search size={19} />
            Which market has the cleanest edge right now?
          </button>
        </div>

        <div className="chat-input">
          <span>&gt;</span>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask Scout anything..."
            onKeyDown={(event) => {
              if (event.key === "Enter") askScout();
            }}
          />
          <button onClick={askScout}>Run</button>
        </div>
      </aside>

      <main className="terminal-main">
        <TradingViewTerminalChart label={activeEvent?.title ?? "ANDROMEDA PAPER INDEX"} />
        <div className="terminal-bottom-bar">
          <button><Braces size={16} /> Code</button>
          <button><Maximize2 size={16} /> Fullscreen</button>
          <span>{message || "Paper mode active. No real-money execution."}</span>
        </div>
      </main>

      <aside className="terminal-right-rail" aria-label="Terminal tools">
        {[Bot, Layers, WalletCards, Crosshair, Bell, Settings].map((Icon, index) => (
          <button key={index}><Icon size={21} /></button>
        ))}
      </aside>

      <section className="terminal-floating-ticket">
        <div>
          <span>Selected event</span>
          <strong>{activeEvent?.title}</strong>
        </div>
        <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </select>
        <div className="ticket-actions">
          <button className="buy-button" onClick={() => quickOrder("yes")}>Buy YES</button>
          <button className="sell-button" onClick={() => quickOrder("no")}>Buy NO</button>
        </div>
        <p>{activeEvent ? `${activeEvent.latest.probability.toFixed(1)}% probability - ${activeEvent.latest.confidence.toFixed(0)} confidence` : "No event selected."}</p>
      </section>
    </div>
  );
}
