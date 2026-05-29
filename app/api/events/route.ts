import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { buildLiveEventFeed } from "@/lib/live-event-feed";
import type { EventCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "all") as EventCategory | "all";
  const q = url.searchParams.get("q") || undefined;
  const feed = await buildLiveEventFeed({ category, q });
  return ok(feed);
}
