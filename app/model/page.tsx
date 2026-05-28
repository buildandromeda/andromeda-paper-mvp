import { AppShell } from "@/components/AppShell";
import { ModelChat } from "@/components/ModelChat";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function ModelPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Andromeda Scout v0.1</span>
        <h1>Grounded event research</h1>
        <p>Scout answers only event, portfolio, strategy, backtest, and comparison prompts. It cannot invent probabilities without stored data.</p>
      </div>
      <ModelChat events={store.listEvents()} />
    </AppShell>
  );
}
