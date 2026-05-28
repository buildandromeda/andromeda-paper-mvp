import { TerminalWorkspace } from "@/components/TerminalWorkspace";
import { store } from "@/lib/demo-store";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let events = store.listEvents();

  if (canUseSupabaseStore()) {
    try {
      const databaseEvents = await supabaseStore.listEvents();
      if (databaseEvents.length > 0) events = databaseEvents;
    } catch {
      events = store.listEvents();
    }
  }

  return <TerminalWorkspace events={events} />;
}
