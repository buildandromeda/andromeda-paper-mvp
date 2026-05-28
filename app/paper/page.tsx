import { AppShell } from "@/components/AppShell";
import { PortfolioClient } from "@/components/PortfolioClient";

export const dynamic = "force-dynamic";

export default function PaperPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Paper portfolio</span>
        <h1>Simulated trading account</h1>
        <p>Every onboarded user starts with $10,000 fake capital. No real money, no broker execution.</p>
      </div>
      <PortfolioClient />
    </AppShell>
  );
}
