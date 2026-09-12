/** The two public values every client needs. Checked rather than assumed so a missing `.env.local`
 * produces a readable screen instead of a Supabase constructor throwing at import time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
