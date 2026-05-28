import { AuthClient } from "@/components/AuthClient";

export default function AuthPage() {
  return (
    <main className="center-page">
      <section className="panel auth-card">
        <div className="section-heading">
          <span>Supabase auth</span>
          <h1>Create your Andromeda account</h1>
        </div>
        <p className="muted">Sign up to persist paper trades, strategies, alerts, model feedback, and rewards in Supabase. Visitors can still explore the public demo without signing in.</p>
        <AuthClient />
      </section>
    </main>
  );
}
