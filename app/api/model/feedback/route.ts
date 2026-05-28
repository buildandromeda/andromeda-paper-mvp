import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getUserId, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";

const schema = z.object({
  modelRunId: z.string().min(1),
  helpful: z.boolean(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await parseJson(req));
    return ok({ feedback: store.feedback(getUserId(req), body.modelRunId, body.helpful, body.note) }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Feedback failed.");
  }
}
