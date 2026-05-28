import Link from "next/link";
import { ReactNode } from "react";
import {
  Bell,
  Bot,
  ChartCandlestick,
  FlaskConical,
  Home,
  Layers,
  LineChart,
  LogIn,
  ShieldCheck,
  Trophy,
  WalletCards,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/events", label: "Events", icon: Layers },
  { href: "/paper", label: "Paper", icon: WalletCards },
  { href: "/backtest", label: "Backtest", icon: LineChart },
  { href: "/strategies", label: "Strategies", icon: FlaskConical },
  { href: "/model", label: "Scout", icon: Bot },
  { href: "/leaderboard", label: "Rewards", icon: Trophy },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/data-sources", label: "Sources", icon: ShieldCheck },
  { href: "/auth", label: "Sign in", icon: LogIn },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup">
          <div className="brand-mark">A</div>
          <div>
            <span>Andromeda</span>
            <strong>Paper Terminal</strong>
          </div>
        </Link>
        <nav className="side-nav" aria-label="Product navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href} className="side-link">
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="paper-disclaimer">
          <ChartCandlestick size={18} />
          <div>
            <strong>Paper mode only</strong>
            <span>No real-money execution, broker orders, Kalshi execution, or Polymarket execution in V1.</span>
          </div>
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
