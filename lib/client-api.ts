import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export function getBrowserSupabase() {
  if (!hasSupabaseEnv()) return null;
  browserClient ??= createBrowserSupabaseClient();
  return browserClient;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const supabase = getBrowserSupabase();

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
