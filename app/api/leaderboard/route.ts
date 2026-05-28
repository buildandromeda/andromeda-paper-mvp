import { ok } from "@/lib/api";
import { store } from "@/lib/demo-store";
import { canUseSupabaseStore, supabaseStore } from "@/lib/supabase-store";

export async function GET() {
  if (canUseSupabaseStore()) {
    try {
      const leaderboard = await supabaseStore.leaderboard();
      if (leaderboard.length > 0) return ok({ leaderboard });
    } catch {
      // Fall back to demo leaderboard.
    }
  }
  return ok({ leaderboard: store.leaderboard() });
}
