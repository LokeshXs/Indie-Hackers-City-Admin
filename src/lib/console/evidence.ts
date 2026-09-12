import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "achievement-evidence";
/** Long enough to read a queue page, short enough that a leaked URL is worthless by the time it
 * reaches anyone. Regenerated on every render, so it never has to outlive the page. */
const SIGNED_URL_SECONDS = 600;

export type ClaimEvidence = {
  link: string | null;
  note: string | null;
  /** A signed, expiring URL for the uploaded screenshot. Null when there is no file, or when the
   * object has gone missing from the bucket. */
  imageUrl: string | null;
};

/** Evidence for a set of claims, keyed by claim id.
 *
 * The bucket is private, so a screenshot cannot be linked to directly -- every image needs a signed
 * URL minted with the secret key. They are batched: a queue of thirty claims should cost one
 * database read and one signing call, not sixty round trips.
 */
export async function loadEvidenceFor(achievementIds: number[]): Promise<Map<number, ClaimEvidence>> {
  if (achievementIds.length === 0) return new Map();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("achievement_evidence")
    .select("achievement_id, link, file_path, note")
    .in("achievement_id", achievementIds);

  if (error) throw new Error(`Could not read evidence: ${error.message}`);

  const paths = (data ?? [])
    .map((row) => row.file_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const entry of urls ?? []) {
      // A path that no longer exists comes back with an error and no URL; the claim still renders,
      // just without the image.
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    }
  }

  return new Map(
    (data ?? []).map((row) => [row.achievement_id, {
      link: row.link,
      note: row.note,
      imageUrl: row.file_path ? signed.get(row.file_path) ?? null : null,
    }]),
  );
}
