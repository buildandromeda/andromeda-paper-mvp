import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  eventId: z.string().min(1),
  action: z.enum(["buy", "sell"]),
  side: z.enum(["yes", "no"]),
  quantity: z.coerce.number().positive(),
});

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const limited = checkRateLimit(`orders:${userId}`, 20, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for paper orders.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    return ok(store.placeOrder({ userId, ...body }), 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order failed.");
  }
}
