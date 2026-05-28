import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getRequestUser, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseStore } from "@/lib/supabase-store";

const schema = z.object({
  eventId: z.string().min(1),
  action: z.enum(["buy", "sell"]),
  side: z.enum(["yes", "no"]),
  quantity: z.coerce.number().positive(),
});

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  const limited = checkRateLimit(`orders:${user.userId}`, 20, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for paper orders.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    const result = user.isAuthenticated
      ? await supabaseStore.placeOrder({ userId: user.userId, ...body })
      : store.placeOrder({ userId: user.userId, ...body });
    return ok(result, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order failed.");
  }
}
