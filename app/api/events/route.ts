import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";
import type { EventCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "all") as EventCategory | "all";
  const q = url.searchParams.get("q") || undefined;
  if (canUseSupabaseStore()) {
    try {
      const events = await supabaseStore.listEvents({ category, q });
      if (events.length > 0) return ok({ events });
    } catch {
      // Fall back to bundled demo data so the public app never blanks out.
    }
  }
  return ok({ events: store.listEvents({ category, q }) });
}
