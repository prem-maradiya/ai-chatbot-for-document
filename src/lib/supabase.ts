import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Guards against copy-paste mistakes in hosting dashboards (trailing newlines,
// or the value accidentally pasted more than once): take the first
// whitespace-delimited token. URLs and keys never contain internal whitespace.
function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim().split(/\s+/)[0] ?? "";
}

// Lazily instantiated so importing this module doesn't require env vars at
// build time. Uses the service-role key — only import from server code.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { persistSession: false } },
    );
  }
  return client;
}
