import type { NextRequest } from "next/server";
import { getUserId, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function POST(req: NextRequest) {
  return ok(store.onboard(getUserId(req)), 201);
}
