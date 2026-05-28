"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("trader");
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("Joining...");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setMessage(res.ok ? `You're on the list. Current demo count: ${data.count}.` : data.error);
  }

  return (
    <div className="form-row">
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
      <select value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="trader">Trader</option>
        <option value="founder">Founder</option>
        <option value="student">Student</option>
        <option value="sponsor">Potential sponsor</option>
      </select>
      <button onClick={submit}>Join waitlist</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}
