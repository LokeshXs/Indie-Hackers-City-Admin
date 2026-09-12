import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

/** Browser client, publishable key only. The console reads nothing privileged through it -- it
 * exists to start the Google OAuth redirect and to sign out. Every privileged read and write goes
 * through a server action holding the secret key. */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  browserClient ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return browserClient;
}
