import { TerminalWorkspace } from "@/components/TerminalWorkspace";
import { buildLiveEventFeed } from "@/lib/live-event-feed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const feed = await buildLiveEventFeed();
  const events = feed.events;

  return <TerminalWorkspace events={events} />;
}
