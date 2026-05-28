import Link from "next/link";

export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="center-page">
      <section className="panel legal-card">
        <div className="section-heading">
          <span>Andromeda</span>
          <h1>{title}</h1>
        </div>
        <p>{body}</p>
        <Link className="secondary-link" href="/">Back home</Link>
      </section>
    </main>
  );
}
