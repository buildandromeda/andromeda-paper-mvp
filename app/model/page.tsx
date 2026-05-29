import { AppShell } from "@/components/AppShell";
import { ModelChat } from "@/components/ModelChat";
import { buildLiveEventFeed } from "@/lib/live-event-feed";

export const dynamic = "force-dynamic";

export default async function ModelPage() {
  const feed = await buildLiveEventFeed();
  return (
    <AppShell>
      <div className="page-heading">
        <span>Andromeda Scout v0.1</span>
        <h1>Grounded event research</h1>
        <p>Scout answers only event, portfolio, strategy, backtest, and comparison prompts. It cannot invent probabilities without stored data.</p>
      </div>
      <ModelChat events={feed.events} />
    </AppShell>
  );
}
