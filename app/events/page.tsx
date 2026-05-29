import { AppShell } from "@/components/AppShell";
import { EventMarketplace } from "@/components/EventMarketplace";
import { buildLiveEventFeed } from "@/lib/live-event-feed";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const feed = await buildLiveEventFeed();

  return (
    <AppShell>
      <EventMarketplace initialEvents={feed.events} initialWarnings={feed.warnings} initialMissingKeys={feed.missingKeys} />
    </AppShell>
  );
}
