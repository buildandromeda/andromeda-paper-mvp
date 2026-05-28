import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  eventId: z.string().min(1),
  threshold: z.coerce.number().min(1).max(99),
  direction: z.enum(["above", "below", "crosses_above", "crosses_below"]),
  maxHoldPeriods: z.coerce.number().int().min(1).max(50),
  stopLossPct: z.coerce.number().min(1).max(95),
  takeProfitPct: z.coerce.number().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const limited = checkRateLimit(`backtests:${userId}`, 10, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for backtests.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    return ok({ backtest: store.runBacktest(userId, body) }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Backtest failed.");
  }
}
