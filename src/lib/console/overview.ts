import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listLevelMilestones } from "./milestones";

export type ConsoleOverview = {
  accountCount: number;
  founderCount: number;
  projectCount: number;
  pendingCount: number;
  approvedCount: number;
  xpAwarded: number;
  foundersByLevel: { level: number; requiredXp: number; count: number }[];
};

async function countRows(table: "plot_claims" | "projects"): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

export async function readConsoleOverview(): Promise<ConsoleOverview> {
  const supabase = getSupabaseAdminClient();

  const [accounts, founderCount, projectCount, pending, approved, levels, milestones] = await Promise.all([
    // perPage 1 because only the total matters; listUsers reports it alongside the page.
    supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    countRows("plot_claims"),
    countRows("projects"),
    supabase.from("project_achievements").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("project_achievements").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("plot_claims").select("building_level, xp_total"),
    listLevelMilestones(),
  ]);

  const claimRows = levels.data ?? [];
  const byLevel = new Map<number, number>();
  for (const row of claimRows) byLevel.set(row.building_level, (byLevel.get(row.building_level) ?? 0) + 1);

  // `total` is absent from the empty arm of the listUsers return union; the founder count is the
  // floor when the admin API does not report one.
  const accountTotal = accounts.data && "total" in accounts.data ? accounts.data.total : undefined;

  return {
    accountCount: accountTotal ?? founderCount,
    founderCount,
    projectCount,
    pendingCount: pending.count ?? 0,
    approvedCount: approved.count ?? 0,
    xpAwarded: claimRows.reduce((sum, row) => sum + row.xp_total, 0),
    foundersByLevel: milestones.map((milestone) => ({
      level: milestone.level,
      requiredXp: milestone.requiredXp,
      count: byLevel.get(milestone.level) ?? 0,
    })),
  };
}
