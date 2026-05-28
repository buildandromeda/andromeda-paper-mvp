"use client";

import { useState } from "react";
import type { store } from "@/lib/demo-store";

type EventWithLatest = ReturnType<typeof store.listEvents>[number];

export function PaperOrderTicket({ event }: { event: EventWithLatest }) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState(10);
  const [message, setMessage] = useState("Orders are simulated and settle only in paper mode.");

  const price = side === "yes" ? event.latest.probability / 100 : 1 - event.latest.probability / 100;

  async function placeOrder() {
    setMessage("Submitting paper order...");
    const res = await fetch("/api/paper/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, action, side, quantity }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.trade.note : data.error);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <span>Paper ticket</span>
        <h2>Trade this event</h2>
      </div>
      <div className="segmented">
        <button className={action === "buy" ? "active" : ""} onClick={() => setAction("buy")}>Buy</button>
        <button className={action === "sell" ? "active" : ""} onClick={() => setAction("sell")}>Sell</button>
      </div>
      <div className="segmented">
        <button className={side === "yes" ? "active" : ""} onClick={() => setSide("yes")}>YES</button>
        <button className={side === "no" ? "active" : ""} onClick={() => setSide("no")}>NO</button>
      </div>
      <label>
        Quantity
        <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
      </label>
      <div className="ticket-math">
        <span>Price</span>
        <strong>{(price * 100).toFixed(1)}c</strong>
      </div>
      <div className="ticket-math">
        <span>Notional</span>
        <strong>${(quantity * price).toFixed(2)}</strong>
      </div>
      <button className="primary-button" onClick={placeOrder}>Place paper order</button>
      <p className="muted">{message}</p>
    </section>
  );
}
