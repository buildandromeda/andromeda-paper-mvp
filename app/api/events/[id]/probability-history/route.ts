import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = store.getEvent(id);
  if (!event) return fail("Event not found.", 404);
  return ok({ eventId: event.id, history: store.history(event.id), bars: store.bars(event.id) });
}
