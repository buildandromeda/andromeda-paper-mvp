import { AppShell } from "@/components/AppShell";
import { OnboardingButton } from "@/components/OnboardingButton";

export default function OnboardingPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Onboarding</span>
        <h1>Create your paper account</h1>
        <p>The demo flow creates a local paper account. In production this happens after Supabase auth signup.</p>
      </div>
      <section className="panel">
        <OnboardingButton />
      </section>
    </AppShell>
  );
}
