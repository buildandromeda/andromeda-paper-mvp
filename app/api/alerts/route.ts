import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  eventId: z.string().min(1),
  condition: z.enum(["above", "below"]),
  probability: z.coerce.number().min(1).max(99),
});

export async function GET(req: NextRequest) {
  return ok({ alerts: store.listAlerts(getUserId(req)) });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const limited = checkRateLimit(`alerts:${userId}`, 10, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for alerts.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    return ok({ alert: store.createAlert(userId, body.eventId, body.condition, body.probability) }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Alert save failed.");
  }
}
