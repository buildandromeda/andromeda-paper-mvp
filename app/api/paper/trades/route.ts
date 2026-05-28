import type { NextRequest } from "next/server";
import { getUserId, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function GET(req: NextRequest) {
  return ok({ trades: store.trades(getUserId(req)) });
}
