import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { buildCustomEventSuggestions } from "@/lib/custom-events";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limited = checkRateLimit(`event-search:${q.toLowerCase().slice(0, 40)}`, 30, 60_000);

  if (!limited.ok) {
    return ok({
      suggestions: [],
      warning: "Search is cooling down for a minute. Try again shortly.",
    }, 429);
  }

  const suggestions = await buildCustomEventSuggestions(q);
  return ok({
    suggestions,
    updatedAt: new Date().toISOString(),
    sources: ["CoinGecko", "Open-Meteo", "Stooq", "GDELT", "The Odds API adapter placeholder"],
  });
}
