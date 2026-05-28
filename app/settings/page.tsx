import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Settings</span>
        <h1>Launch configuration</h1>
        <p>Connect Supabase, Vercel, Resend, Sentry, PostHog, and provider API keys before production launch.</p>
      </div>
      <section className="panel">
        <div className="section-heading"><span>Environment</span><h2>Required production setup</h2></div>
        <ul className="check-list">
          <li>Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</li>
          <li>Set `SUPABASE_SERVICE_ROLE_KEY` only on Vercel server environment.</li>
          <li>Run separate staging and production Supabase projects.</li>
          <li>Set provider API keys only in Vercel, never in client code.</li>
        </ul>
      </section>
    </AppShell>
  );
}
