import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  const events = store.listEvents();
  return (
    <AppShell>
      <div className="page-heading">
        <span>Event explorer</span>
        <h1>Browse prediction events</h1>
        <p>V1 stores Andromeda-owned events generated from external factual data sources and cached snapshots.</p>
      </div>
      <div className="event-grid">
        {events.map((event) => <EventCard event={event} key={event.id} />)}
      </div>
    </AppShell>
  );
}
