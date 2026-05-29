import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazily instantiated so importing this module doesn't require env vars at
// build time. Uses the service-role key — only import from server code.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}
