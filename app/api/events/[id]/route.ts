import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (canUseSupabaseStore()) {
    try {
      const event = await supabaseStore.getEvent(id);
      if (event) return ok({
        event,
        sources: await supabaseStore.sources(event.id),
        history: await supabaseStore.history(event.id),
      });
    } catch {
      // Fall back to bundled demo data.
    }
  }
  const event = store.getEvent(id);
  if (!event) return fail("Event not found.", 404);
  return ok({ event, sources: store.sources(event.id), history: store.history(event.id) });
}
