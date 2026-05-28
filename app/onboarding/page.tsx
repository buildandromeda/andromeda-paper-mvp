import { AppShell } from "@/components/AppShell";
import { OnboardingButton } from "@/components/OnboardingButton";

export default function OnboardingPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Onboarding</span>
        <h1>Create your paper account</h1>
        <p>Signed-in users get a persistent Supabase paper account. Visitors can still use demo mode without saving data.</p>
      </div>
      <section className="panel">
        <OnboardingButton />
      </section>
    </AppShell>
  );
}
