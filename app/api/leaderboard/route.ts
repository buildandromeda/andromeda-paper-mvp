import { ok } from "@/lib/api";
import { store } from "@/lib/demo-store";

export async function GET() {
  return ok({ leaderboard: store.leaderboard() });
}
