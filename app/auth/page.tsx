import Link from "next/link";

export default function AuthPage() {
  return (
    <main className="center-page">
      <section className="panel auth-card">
        <div className="section-heading">
          <span>Auth placeholder</span>
          <h1>Supabase auth goes here</h1>
        </div>
        <p className="muted">This local MVP uses a demo user so the product works before Supabase credentials exist. Once your Supabase project is created, replace this page with Supabase email/password or magic-link auth.</p>
        <Link className="primary-link" href="/onboarding">Continue demo onboarding</Link>
      </section>
    </main>
  );
}
