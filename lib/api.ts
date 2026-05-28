import { NextResponse, type NextRequest } from "next/server";
import { DEMO_USER_ID } from "@/lib/utils";

export function getUserId(req: NextRequest) {
  return req.headers.get("x-andromeda-user-id") || DEMO_USER_ID;
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
