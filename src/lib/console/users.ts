import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { levelProgressFor, listLevelMilestones } from "./milestones";
import type { ConsoleUser, ConsoleUserDetail } from "./types";

export const USERS_PAGE_SIZE = 25;

type AuthAccount = {
  id: string;
  email: string | null;
  provider: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

/** `auth.users` is not exposed through PostgREST at any key, so the admin API is the only way to
 * reach email addresses and sign-in times. It pages rather than filters, which is why search below
 * happens in memory over the fetched page set. */
async function listAuthAccounts(page: number, perPage: number): Promise<{ accounts: AuthAccount[]; hasMore: boolean }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) throw new Error(`Could not read accounts: ${error.message}`);

  const accounts = data.users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    provider: (user.app_metadata?.provider as string | undefined) ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  }));

  return { accounts, hasMore: data.users.length === perPage };
}

/** Everything the city schema knows about a set of accounts, in four indexed reads rather than one
 * embed: `project_achievements` reaches `projects` only through a composite (project_id, owner_id)
 * foreign key, and PostgREST embeds over composite keys are fragile. */
async function decorate(accounts: AuthAccount[]): Promise<ConsoleUser[]> {
  if (accounts.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  const ids = accounts.map((account) => account.id);

  const [profiles, claims, projects, achievements] = await Promise.all([
    supabase.from("profiles").select("id, full_name, x_handle, avatar_url").in("id", ids),
    supabase
      .from("plot_claims")
      .select("owner_id, plot_id, building_asset_id, building_level, xp_total, claimed_at")
      .in("owner_id", ids),
    supabase.from("projects").select("id, owner_id").in("owner_id", ids),
    supabase.from("project_achievements").select("owner_id, status").in("owner_id", ids),
  ]);

  for (const result of [profiles, claims, projects, achievements]) {
    if (result.error) throw new Error(`Could not read city records: ${result.error.message}`);
  }

  const profileById = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const claimByOwner = new Map((claims.data ?? []).map((row) => [row.owner_id, row]));

  const projectCounts = new Map<string, number>();
  for (const row of projects.data ?? []) {
    projectCounts.set(row.owner_id, (projectCounts.get(row.owner_id) ?? 0) + 1);
  }

  const approved = new Map<string, number>();
  const pending = new Map<string, number>();
  for (const row of achievements.data ?? []) {
    const bucket = row.status === "pending" ? pending : row.status === "approved" ? approved : null;
    if (!bucket) continue;
    bucket.set(row.owner_id, (bucket.get(row.owner_id) ?? 0) + 1);
  }

  return accounts.map((account) => {
    const profile = profileById.get(account.id);
    const claim = claimByOwner.get(account.id);
    return {
      ...account,
      profile: profile
        ? { fullName: profile.full_name, xHandle: profile.x_handle, avatarUrl: profile.avatar_url }
        : null,
      plot: claim
        ? {
            plotId: claim.plot_id,
            buildingAssetId: claim.building_asset_id,
            buildingLevel: claim.building_level,
            xpTotal: claim.xp_total,
            claimedAt: claim.claimed_at,
          }
        : null,
      projectCount: projectCounts.get(account.id) ?? 0,
      approvedAchievements: approved.get(account.id) ?? 0,
      pendingAchievements: pending.get(account.id) ?? 0,
    };
  });
}

function matchesQuery(user: ConsoleUser, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  return [user.email, user.profile?.fullName, user.profile?.xHandle, user.plot?.plotId, user.id]
    .some((field) => typeof field === "string" && field.toLowerCase().includes(needle));
}

export type UsersPage = {
  users: ConsoleUser[];
  page: number;
  hasMore: boolean;
};

export async function listConsoleUsers({ page = 1, query = "" }: { page?: number; query?: string } = {}): Promise<UsersPage> {
  const { accounts, hasMore } = await listAuthAccounts(page, USERS_PAGE_SIZE);
  const users = await decorate(accounts);
  const filtered = users.filter((user) => matchesQuery(user, query));
  return { users: filtered, page, hasMore };
}

export async function getConsoleUser(userId: string): Promise<ConsoleUserDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;

  const account: AuthAccount = {
    id: data.user.id,
    email: data.user.email ?? null,
    provider: (data.user.app_metadata?.provider as string | undefined) ?? null,
    createdAt: data.user.created_at,
    lastSignInAt: data.user.last_sign_in_at ?? null,
  };

  const [base] = await decorate([account]);

  const [projects, achievements, xpEvents, definitions, milestones] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, website_url, project_type, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_achievements")
      .select("id, achievement_type, project_id, xp_awarded, status, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    // The XP ledger is the audit trail: it is append-only, and a correction is a negative row
    // rather than an edit, so reading it top-down explains any total on screen.
    supabase
      .from("plot_xp_events")
      .select("id, event_key, event_type, xp_delta, description, awarded_by, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from("achievement_definitions").select("achievement_type, label, scope, group_key, tier"),
    listLevelMilestones(),
  ]);

  const showcasedProjectId = base.plot
    ? (await supabase.from("plot_claims").select("project_id").eq("owner_id", userId).maybeSingle()).data?.project_id ?? null
    : null;

  const projectById = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const definitionByType = new Map((definitions.data ?? []).map((row) => [row.achievement_type, row]));

  return {
    ...base,
    progress: base.plot ? levelProgressFor(base.plot.xpTotal, milestones) : null,
    projects: (projects.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      websiteUrl: row.website_url,
      projectType: row.project_type,
      isShowcased: row.id === showcasedProjectId,
      createdAt: row.created_at,
    })),
    achievements: (achievements.data ?? []).map((row) => {
      const definition = definitionByType.get(row.achievement_type);
      return {
        id: row.id,
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
      };
    }),
    xpEvents: (xpEvents.data ?? []).map((row) => ({
      id: row.id,
      eventKey: row.event_key,
      eventType: row.event_type,
      xpDelta: row.xp_delta,
      description: row.description,
      awardedBy: row.awarded_by,
      createdAt: row.created_at,
    })),
  };
}
