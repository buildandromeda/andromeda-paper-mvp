import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, getRequestUser, ok, parseJson } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { supabaseStore } from "@/lib/supabase-store";

const schema = z.object({
  modelRunId: z.string().min(1),
  helpful: z.boolean(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    const body = schema.parse(await parseJson(req));
    const feedback = user.isAuthenticated
      ? await supabaseStore.feedback(user.userId, body.modelRunId, body.helpful, body.note)
      : store.feedback(user.userId, body.modelRunId, body.helpful, body.note);
    return ok({ feedback }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Feedback failed.");
  }
}
