import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getRequestUser, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseStore } from "@/lib/supabase-store";

const schema = z.object({
  eventId: z.string().min(1),
  condition: z.enum(["above", "below"]),
  probability: z.coerce.number().min(1).max(99),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  return ok({ alerts: user.isAuthenticated
    ? await supabaseStore.listAlerts(user.userId)
    : store.listAlerts(user.userId) });
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  const limited = checkRateLimit(`alerts:${user.userId}`, 10, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for alerts.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    const alert = user.isAuthenticated
      ? await supabaseStore.createAlert(user.userId, body.eventId, body.condition, body.probability)
      : store.createAlert(user.userId, body.eventId, body.condition, body.probability);
    return ok({ alert }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Alert save failed.");
  }
}
