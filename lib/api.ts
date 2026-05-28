import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { canUseSupabaseStore } from "@/lib/supabase-store";
import { DEMO_USER_ID } from "@/lib/utils";

export function getUserId(req: NextRequest) {
  return req.headers.get("x-andromeda-user-id") || DEMO_USER_ID;
}

export async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token || !canUseSupabaseStore()) return null;

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function getRequestUser(req: NextRequest) {
  const authenticatedUserId = await getAuthenticatedUserId(req);
  return {
    userId: authenticatedUserId ?? getUserId(req),
    isAuthenticated: Boolean(authenticatedUserId),
  };
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body.");
  }
}
