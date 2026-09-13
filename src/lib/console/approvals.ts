import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadEvidenceFor, type ClaimEvidence } from "./evidence";
import type { ConsoleAchievement } from "./types";

export type PendingAchievement = ConsoleAchievement & {
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerXpTotal: number | null;
  ownerBuildingLevel: number | null;
  evidence: ClaimEvidence | undefined;
};

/** Head-only count, so the sidebar badge costs one cheap query rather than a full read. */
export async function countPendingAchievements(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("project_achievements")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw new Error(`Could not count pending claims: ${error.message}`);
  return count ?? 0;
}

/** The review queue: every claim awaiting a decision, oldest first so nobody waits behind a later
 * submission. Emails come from the auth admin API, which PostgREST cannot reach. */
export async function listPendingAchievements(): Promise<PendingAchievement[]> {
  const supabase = getSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("project_achievements")
    .select("id, owner_id, achievement_type, project_id, xp_awarded, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not read the review queue: ${error.message}`);
  if (!rows || rows.length === 0) return [];

  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter((id): id is string => Boolean(id)))];

  const [profiles, claims, projects, definitions, evidence] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ownerIds),
    supabase.from("plot_claims").select("owner_id, xp_total, building_level").in("owner_id", ownerIds),
    projectIds.length
      ? supabase.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null } as const),
    supabase.from("achievement_definitions").select("achievement_type, label, scope, group_key, tier"),
    loadEvidenceFor(rows.map((row) => row.id)),
  ]);

  const emails = new Map<string, string | null>();
  await Promise.all(ownerIds.map(async (id) => {
    const { data } = await supabase.auth.admin.getUserById(id);
    emails.set(id, data?.user?.email ?? null);
  }));

  const nameById = new Map((profiles.data ?? []).map((row) => [row.id, row.full_name]));
  const claimByOwner = new Map((claims.data ?? []).map((row) => [row.owner_id, row]));
  const projectById = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const definitionByType = new Map((definitions.data ?? []).map((row) => [row.achievement_type, row]));

  return rows.map((row) => {
    const definition = definitionByType.get(row.achievement_type);
    const claim = claimByOwner.get(row.owner_id);
    return {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: nameById.get(row.owner_id) ?? "",
      ownerEmail: emails.get(row.owner_id) ?? null,
      ownerXpTotal: claim?.xp_total ?? null,
      ownerBuildingLevel: claim?.building_level ?? null,
      achievementType: row.achievement_type,
      label: definition?.label ?? row.achievement_type,
      projectId: row.project_id,
      projectName: row.project_id ? projectById.get(row.project_id)?.name ?? null : null,
      scope: definition?.scope ?? "project",
      groupKey: definition?.group_key ?? "",
      tier: definition?.tier ?? 1,
      xpAwarded: row.xp_awarded,
      status: row.status,
      createdAt: row.created_at,
      evidence: evidence.get(row.id),
    };
  });
}
