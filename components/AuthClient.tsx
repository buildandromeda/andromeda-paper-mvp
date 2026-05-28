"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/client-api";

export function AuthClient() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase environment variables are missing, so auth is in demo mode.");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function submit() {
    setMessage("Working...");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase auth is not configured yet.");
      return;
    }

    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || "Andromeda User" } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (result.data.session) {
      setMessage("You are signed in. Continue to onboarding.");
    } else {
      setMessage("Account created. Check your email if Supabase email confirmation is enabled.");
    }
  }

  async function signOut() {
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    setMessage("Signed out.");
  }

  if (sessionEmail) {
    return (
      <div className="stack">
        <div className="metric-card">
          <span>Signed in as</span>
          <strong>{sessionEmail}</strong>
        </div>
        <div className="button-row">
          <Link className="primary-link" href="/onboarding">Continue onboarding</Link>
          <button onClick={signOut}>Sign out</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="segmented">
        <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
      </div>
      {mode === "signup" && (
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
        </label>
      )}
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
      </label>
      <button className="primary-button" onClick={submit}>
        {mode === "signup" ? "Create account" : "Sign in"}
      </button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}
