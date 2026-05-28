import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { catalogEvents, mergeEventLists } from "@/lib/event-catalog";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";
import type { EventCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "all") as EventCategory | "all";
  const q = url.searchParams.get("q") || undefined;
  const bundledEvents = catalogEvents({ category, q });

  if (canUseSupabaseStore()) {
    try {
      const databaseEvents = await supabaseStore.listEvents({ category, q });
      return ok({
        events: mergeEventLists(databaseEvents, bundledEvents),
        updatedAt: new Date().toISOString(),
        source: "andromeda-catalog-plus-supabase",
      });
    } catch {
      // Fall back to bundled demo data so the public app never blanks out.
    }
  }

  return ok({
    events: bundledEvents,
    updatedAt: new Date().toISOString(),
    source: "andromeda-catalog",
  });
}
