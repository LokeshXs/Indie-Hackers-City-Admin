import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: SupabaseClient<Database> | undefined;

/** A client holding the Supabase secret key. It bypasses every RLS policy and satisfies the
 * `service_role` check inside `award_plot_xp`, which is the whole reason the console can move XP at
 * all.
 *
 * Two guards keep it where it belongs. `server-only` makes importing this module from a client
 * component a build error, and callers are expected to have already passed `requireAdmin()` -- this
 * function authenticates the console to Postgres, it does not authorise the person driving it. */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. The admin console cannot read or write without it.",
    );
  }

  adminClient ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    // No cookie storage and no refresh loop: this client is stateless and per-request by nature,
    // and persisting its session would risk leaking a service-role token into a shared store.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}
