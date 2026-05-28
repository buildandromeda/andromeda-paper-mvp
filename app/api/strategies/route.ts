import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(4),
  eventCategory: z.enum(["sports", "weather", "economics", "stocks", "crypto", "politics", "entertainment", "all"]),
  rule: z.string().min(5),
});

export async function GET(req: NextRequest) {
  return ok({ strategies: store.listStrategies(getUserId(req)) });
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await parseJson(req));
    return ok({ strategy: store.saveStrategy(getUserId(req), body) }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Strategy save failed.");
  }
}
