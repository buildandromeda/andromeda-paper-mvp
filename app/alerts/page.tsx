import { AppShell } from "@/components/AppShell";
import { AlertsClient } from "@/components/AlertsClient";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Alerts</span>
        <h1>Probability notifications</h1>
        <p>V1 stores alerts in-app. Resend email delivery is ready once production env vars are added.</p>
      </div>
      <AlertsClient events={store.listEvents()} />
    </AppShell>
  );
}
