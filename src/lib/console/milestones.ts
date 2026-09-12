import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LevelMilestone, LevelProgress } from "./types";

/** `building_level_milestones` has RLS on and every grant revoked from the browser roles, so this
 * table is readable only through the secret key. That is why the city app hard-codes nothing about
 * thresholds and why the console can edit them. */
export async function listLevelMilestones(): Promise<LevelMilestone[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("building_level_milestones")
    .select("level, required_xp")
    .order("level", { ascending: true });

  if (error) throw new Error(`Could not read level milestones: ${error.message}`);
  return (data ?? []).map((row) => ({ level: row.level, requiredXp: row.required_xp }));
}

/** Derives the same level Postgres would, from the same table `building_level_for_xp` reads, so the
 * console never displays a level the database disagrees with. */
export function levelProgressFor(xpTotal: number, milestones: LevelMilestone[]): LevelProgress {
  const ordered = [...milestones].sort((a, b) => a.requiredXp - b.requiredXp);
  const passed = ordered.filter((milestone) => milestone.requiredXp <= xpTotal);
  const current = passed.at(-1) ?? ordered[0] ?? { level: 1, requiredXp: 0 };
  const next = ordered.find((milestone) => milestone.requiredXp > xpTotal) ?? null;

  return {
    level: current.level,
    xpTotal,
    currentLevelXp: current.requiredXp,
    nextLevelXp: next?.requiredXp ?? null,
    xpIntoLevel: xpTotal - current.requiredXp,
    xpForLevel: next ? next.requiredXp - current.requiredXp : null,
  };
}
