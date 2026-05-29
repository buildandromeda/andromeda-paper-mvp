import { AppShell } from "@/components/AppShell";
import { BacktestLab } from "@/components/BacktestLab";
import { buildLiveEventFeed } from "@/lib/live-event-feed";

export const dynamic = "force-dynamic";

export default async function BacktestPage() {
  const feed = await buildLiveEventFeed();
  const events = feed.events.filter((event) => (event.bars?.length ?? 0) >= 10);

  return (
    <AppShell>
      <div className="page-heading">
        <span>Backtesting</span>
        <h1>Test probability rules</h1>
        <p>Backtests run only against provider-derived probability history. Events without at least 10 snapshots are blocked instead of producing fake numbers.</p>
      </div>
      <BacktestLab events={events} />
    </AppShell>
  );
}
