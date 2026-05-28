import { AppShell } from "@/components/AppShell";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const rows = store.leaderboard();
  return (
    <AppShell>
      <div className="page-heading">
        <span>Rewards</span>
        <h1>Risk-adjusted paper leaderboard</h1>
        <p>Points are non-cash in V1. No redeemable rewards until legal review.</p>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rank</th><th>User</th><th>Total</th><th>Return</th><th>Trades</th><th>Feedback</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.userId}><td>#{row.rank}</td><td>{row.displayName}</td><td>{row.totalScore}</td><td>{row.paperReturnPct.toFixed(2)}%</td><td>{row.tradeCount}</td><td>{row.feedbackScore}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
