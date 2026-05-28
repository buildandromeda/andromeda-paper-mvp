import type { NextRequest } from "next/server";
import { fail, getUserId, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const backtest = store.getBacktest(getUserId(req), id);
  if (!backtest) return fail("Backtest not found.", 404);
  return ok({ backtest });
}
