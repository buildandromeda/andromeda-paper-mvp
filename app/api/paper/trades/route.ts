import type { NextRequest } from "next/server";
import { getRequestUser, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  return ok({ trades: user.isAuthenticated
    ? await supabaseStore.trades(user.userId)
    : store.trades(user.userId) });
}
