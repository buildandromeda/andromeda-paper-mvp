import type { NextRequest } from "next/server";
import { getRequestUser, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (user.isAuthenticated) return ok(await supabaseStore.onboard(user.userId), 201);
  return ok(store.onboard(user.userId), 201);
}
