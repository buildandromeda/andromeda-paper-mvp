import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  role: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const limited = checkRateLimit(`waitlist:${ip}`, 5, 60_000);
  if (!limited.ok) return fail("Rate limit exceeded for waitlist submissions.", 429);

  try {
    const body = schema.parse(await parseJson(req));
    return ok(store.joinWaitlist(body.email, body.role), 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Waitlist submission failed.");
  }
}
