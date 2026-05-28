import type { NextRequest } from "next/server";
import { getRequestUser, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getRequestUser(req);
  return ok(user.isAuthenticated
    ? await supabaseStore.deleteAlert(user.userId, id)
    : store.deleteAlert(user.userId, id));
}
