import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AchievementDefinition = {
  achievementType: string;
  label: string;
  description: string;
  xpReward: number;
  sortOrder: number;
  groupKey: string;
  tier: number;
  scope: string;
  requiresNewProject: boolean;
  evidencePrompt: string;
  evidenceHint: string;
  awardedCount: number;
  pendingCount: number;
};

/** The catalog plus how often each rung has actually been claimed, so an admin editing a reward can
 * see what it is attached to. Past awards are not repriced by an edit -- the XP ledger is
 * append-only, and a new reward applies only to claims approved afterwards. */
export async function listAchievementDefinitions(): Promise<AchievementDefinition[]> {
  const supabase = getSupabaseAdminClient();

  const [definitions, awards] = await Promise.all([
    supabase
      .from("achievement_definitions")
      .select("achievement_type, label, description, xp_reward, sort_order, group_key, tier, scope, requires_new_project, evidence_prompt, evidence_hint")
      .order("sort_order", { ascending: true }),
    supabase.from("project_achievements").select("achievement_type, status"),
  ]);

  if (definitions.error) throw new Error(`Could not read the catalog: ${definitions.error.message}`);

  const awarded = new Map<string, number>();
  const pending = new Map<string, number>();
  for (const row of awards.data ?? []) {
    const bucket = row.status === "pending" ? pending : row.status === "approved" ? awarded : null;
    if (!bucket) continue;
    bucket.set(row.achievement_type, (bucket.get(row.achievement_type) ?? 0) + 1);
  }

  return (definitions.data ?? []).map((row) => ({
    achievementType: row.achievement_type,
    label: row.label,
    description: row.description,
    xpReward: row.xp_reward,
    sortOrder: row.sort_order,
    groupKey: row.group_key,
    tier: row.tier,
    scope: row.scope,
    requiresNewProject: row.requires_new_project,
    evidencePrompt: row.evidence_prompt,
    evidenceHint: row.evidence_hint,
    awardedCount: awarded.get(row.achievement_type) ?? 0,
    pendingCount: pending.get(row.achievement_type) ?? 0,
  }));
}
