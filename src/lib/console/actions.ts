"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkSiteForToken } from "./site-check";

export type ReviewResult = { ok: boolean; message: string };

/** Postgres raises these as bare messages, the same convention the city app's RPCs use. */
const MESSAGES: Record<string, string> = {
  achievement_not_found: "That claim no longer exists.",
  project_not_found: "That project no longer exists.",
  achievement_not_pending: "Someone already decided this one. Reload the queue.",
  achievement_not_approved: "That claim is not approved, so there is nothing to take back.",
  xp_total_below_zero: "Revoking this would push the founder below zero XP. Award a correction first.",
  invalid_milestone_order: "Thresholds have to keep climbing, and level 1 stays at 0.",
  milestone_not_found: "There is no such level.",
  invalid_achievement: "There is no such achievement.",
  not_authorized: "The console is not authenticated to the database as a reviewer.",
};

function readError(message: string): string {
  const known = Object.keys(MESSAGES).find((code) => message.includes(code));
  return known ? MESSAGES[known] : "That did not work. Try again.";
}

function trimmedNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  // The column caps at 500; sending a longer one would fail the constraint rather than the request.
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

/** Refreshes every page whose numbers a decision moves: the queue, the sidebar badge on all of
 * them, the founder's own record, and the catalog's approved counts. */
function revalidateConsole(): void {
  for (const path of ["/", "/approvals", "/users", "/achievements", "/milestones"]) {
    revalidatePath(path, "page");
  }
  revalidatePath("/users/[userId]", "page");
}

export async function approveAchievement(achievementId: number, note?: string): Promise<ReviewResult> {
  // Re-checked here rather than trusted from the layout: a server action is a public endpoint, and
  // nothing stops a crafted request calling it without ever rendering the page.
  const { user } = await requireAdmin();

  const { data, error } = await getSupabaseAdminClient().rpc("approve_achievement", {
    target_achievement_id: achievementId,
    reviewer_user_id: user.id,
    reviewer_note: trimmedNote(note),
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();

  const result = data?.[0];
  if (!result) return { ok: true, message: "Approved." };

  const rungs = result.approved_count > 1 ? ` across ${result.approved_count} rungs` : "";
  const levelled = result.level_changed ? ` They are now level ${result.building_level}.` : "";
  return {
    ok: true,
    message: `Approved. +${result.xp_awarded} XP${rungs}, taking them to ${result.xp_total}.${levelled}`,
  };
}

export async function rejectAchievement(achievementId: number, note?: string): Promise<ReviewResult> {
  const { user } = await requireAdmin();

  const { error } = await getSupabaseAdminClient().rpc("reject_achievement", {
    target_achievement_id: achievementId,
    reviewer_user_id: user.id,
    reviewer_note: trimmedNote(note),
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();
  return { ok: true, message: "Rejected. No XP moved, and the founder can file it again." };
}

export async function revokeAchievement(achievementId: number, note?: string): Promise<ReviewResult> {
  const { user } = await requireAdmin();

  const { data, error } = await getSupabaseAdminClient().rpc("revoke_achievement", {
    target_achievement_id: achievementId,
    reviewer_user_id: user.id,
    reviewer_note: trimmedNote(note),
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();

  const result = data?.[0];
  return {
    ok: true,
    message: result
      ? `Revoked. −${result.xp_removed} XP, leaving them on ${result.xp_total}.`
      : "Revoked.",
  };
}

/** Fetches a project's site, looks for its verification tag, and records the outcome.
 *
 * Deliberately an admin action rather than something a founder can trigger. Two reasons: a check a
 * founder could fire and have written would be a founder marking their own homework, and pointing
 * a server at a caller-supplied URL is a request-forgery surface that belongs behind the console's
 * allow-list rather than in front of every signed-in account.
 */
export async function verifyProjectSite(projectId: string): Promise<ReviewResult> {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("website_url, verification_token")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) return { ok: false, message: MESSAGES.project_not_found };

  const check = await checkSiteForToken(project.website_url, project.verification_token);
  if (!check.ok) return { ok: false, message: check.reason };

  const { error } = await supabase.rpc("record_site_verification", {
    target_project_id: projectId,
    checked_url: check.finalUrl,
    tag_found: check.found,
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();

  return {
    ok: check.found,
    message: check.found
      ? "Verification tag found. This founder controls the site."
      : "No verification tag on that page. Ask the founder to add it to their <head>.",
  };
}

/** Re-prices or re-words one rung.
 *
 * Not retroactive, and the console says so: the XP ledger is append-only, so past awards keep the
 * amount they were written with and a new price applies to claims approved afterwards. */
export async function updateAchievementDefinition(
  achievementType: string,
  changes: { xpReward?: number; label?: string; description?: string; prompt?: string; hint?: string },
): Promise<ReviewResult> {
  const { user } = await requireAdmin();

  const { error } = await getSupabaseAdminClient().rpc("update_achievement_definition", {
    target_achievement_type: achievementType,
    new_xp_reward: changes.xpReward,
    new_label: changes.label,
    new_description: changes.description,
    new_evidence_prompt: changes.prompt,
    new_evidence_hint: changes.hint,
    actor_user_id: user.id,
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();
  return { ok: true, message: "Saved. Claims approved from now on use the new amount." };
}

/** Moves one rung of the level ladder.
 *
 * This one IS retroactive -- levels are derived from the table on every read, so every founder is
 * re-levelled in the same transaction and buildings change height. The count comes back so the
 * console can say how many. */
export async function setLevelMilestone(level: number, requiredXp: number): Promise<ReviewResult> {
  const { user } = await requireAdmin();

  const { data, error } = await getSupabaseAdminClient().rpc("set_level_milestone", {
    target_level: level,
    new_required_xp: requiredXp,
    actor_user_id: user.id,
  });

  if (error) return { ok: false, message: readError(error.message) };
  revalidateConsole();

  const moved = data?.[0]?.founders_relevelled ?? 0;
  return {
    ok: true,
    message: moved === 0
      ? `Level ${level} now needs ${requiredXp.toLocaleString("en-GB")} XP. No founder changed level.`
      : `Level ${level} now needs ${requiredXp.toLocaleString("en-GB")} XP. ${moved} founder${moved === 1 ? "" : "s"} re-levelled.`,
  };
}
