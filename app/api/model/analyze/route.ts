import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getRequestUser, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { getLiveEvent } from "@/lib/live-event-feed";
import { checkRateLimit } from "@/lib/rate-limit";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

const schema = z.object({
  prompt: z.string().min(3),
  eventId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  const limited = checkRateLimit(`model:${user.userId}`, 15, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for model analysis.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    if (body.eventId) {
      const liveEvent = await getLiveEvent(body.eventId);
      if (liveEvent) {
        if (user.isAuthenticated && canUseSupabaseStore()) await supabaseStore.upsertLiveEvent(liveEvent);
        else store.registerLiveEvent(liveEvent);
      }
    }
    const run = await (user.isAuthenticated
      ? await supabaseStore.analyze(user.userId, body.prompt, body.eventId)
      : store.analyze(user.userId, body.prompt, body.eventId));
    return ok({ run }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Model analysis failed.");
  }
}
