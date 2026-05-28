import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import type { EventCategory } from "@/lib/types";

export async function POST(req: NextRequest, context: { params: Promise<{ category: string }> }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && req.headers.get("authorization") !== `Bearer ${serviceKey}`) {
    return fail("Service-role authorization required.", 401);
  }
  const { category } = await context.params;
  return ok(store.resolve(category as EventCategory), 202);
}
