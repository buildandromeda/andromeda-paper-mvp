import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  prompt: z.string().min(3),
  eventId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const limited = checkRateLimit(`model:${userId}`, 15, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for model analysis.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    return ok({ run: store.analyze(userId, body.prompt, body.eventId) }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Model analysis failed.");
  }
}
