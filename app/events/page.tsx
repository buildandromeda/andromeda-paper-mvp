import { AppShell } from "@/components/AppShell";
import { EventMarketplace } from "@/components/EventMarketplace";
import { catalogEvents, mergeEventLists } from "@/lib/event-catalog";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events = catalogEvents();
  if (canUseSupabaseStore()) {
    try {
      const databaseEvents = await supabaseStore.listEvents();
      events = mergeEventLists(databaseEvents, events);
    } catch {
      events = catalogEvents();
    }
  }

  return (
    <AppShell>
      <EventMarketplace initialEvents={events} />
    </AppShell>
  );
}
