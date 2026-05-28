import type { NextRequest } from "next/server";
import { getUserId, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return ok(store.deleteAlert(getUserId(req), id));
}
