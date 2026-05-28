import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getRequestUser, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(4),
  eventCategory: z.enum(["sports", "weather", "economics", "stocks", "crypto", "politics", "entertainment", "all"]),
  rule: z.string().min(5),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  return ok({ strategies: user.isAuthenticated
    ? await supabaseStore.listStrategies(user.userId)
    : store.listStrategies(user.userId) });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    const body = schema.parse(await parseJson(req));
    const strategy = user.isAuthenticated
      ? await supabaseStore.saveStrategy(user.userId, body)
      : store.saveStrategy(user.userId, body);
    return ok({ strategy }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Strategy save failed.");
  }
}
