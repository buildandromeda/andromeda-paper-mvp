import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function POST(req: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && req.headers.get("authorization") !== `Bearer ${serviceKey}`) {
    return fail("Service-role authorization required.", 401);
  }
  const { provider } = await context.params;
  return ok(store.ingest(provider), 202);
}
