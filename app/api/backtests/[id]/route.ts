import type { NextRequest } from "next/server";
import { fail, getRequestUser, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getRequestUser(req);
  const backtest = user.isAuthenticated
    ? await supabaseStore.getBacktest(user.userId, id)
    : store.getBacktest(user.userId, id);
  if (!backtest) return fail("Backtest not found.", 404);
  return ok({ backtest });
}
