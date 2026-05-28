import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import type { EventCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "all") as EventCategory | "all";
  const q = url.searchParams.get("q") || undefined;
  return ok({ events: store.listEvents({ category, q }) });
}
