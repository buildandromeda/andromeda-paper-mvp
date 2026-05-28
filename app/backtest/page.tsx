import { AppShell } from "@/components/AppShell";
import { BacktestLab } from "@/components/BacktestLab";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function BacktestPage() {
  return (
    <AppShell>
      <div className="page-heading">
        <span>Backtesting</span>
        <h1>Test probability rules</h1>
        <p>Backtests run against stored probability snapshots. If history is too thin, the engine returns a clear error.</p>
      </div>
      <BacktestLab events={store.listEvents()} />
    </AppShell>
  );
}
