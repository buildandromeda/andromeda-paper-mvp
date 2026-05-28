"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/client-api";

export function OnboardingButton() {
  const [message, setMessage] = useState("");

  async function onboard() {
    const res = await authenticatedFetch("/api/auth/onboarding", { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? `Paper account ready with $${data.account.cash.toFixed(2)}.` : data.error);
  }

  return (
    <div>
      <button className="primary-button" onClick={onboard}>Complete onboarding</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}
