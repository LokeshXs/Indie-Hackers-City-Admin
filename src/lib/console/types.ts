/** What the console shows for one row of the people list.
 *
 * Deliberately a superset of "founder": an account that signed in but never claimed a plot has no
 * `plot_claims` row and therefore no level or XP, and those accounts still need to be visible --
 * they are exactly the ones an admin is asked about. `plot` is null for them. */
export type ConsoleUser = {
  id: string;
  email: string | null;
  provider: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  profile: {
    fullName: string;
    xHandle: string | null;
    avatarUrl: string | null;
  } | null;
  plot: {
    plotId: string;
    buildingAssetId: string;
    buildingLevel: number;
    xpTotal: number;
    claimedAt: string;
  } | null;
  projectCount: number;
  approvedAchievements: number;
  pendingAchievements: number;
};

export type LevelMilestone = {
  level: number;
  requiredXp: number;
};

/** Where a founder sits between the milestone they have passed and the one ahead. `nextLevelXp` is
 * null at the top level, which is the only case where the bar should read as complete. */
export type LevelProgress = {
  level: number;
  xpTotal: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpForLevel: number | null;
};

export type ConsoleProject = {
  id: string;
  name: string;
  websiteUrl: string;
  projectType: string;
  isShowcased: boolean;
  createdAt: string;
};

export type ConsoleAchievement = {
  id: number;
  achievementType: string;
  label: string;
  projectId: string | null;
  projectName: string | null;
  scope: string;
  groupKey: string;
  tier: number;
  xpAwarded: number;
  status: string;
  createdAt: string;
};

export type ConsoleXpEvent = {
  id: number;
  eventKey: string;
  eventType: string;
  xpDelta: number;
  description: string | null;
  awardedBy: string;
  createdAt: string;
};

export type ConsoleUserDetail = ConsoleUser & {
  progress: LevelProgress | null;
  projects: ConsoleProject[];
  achievements: ConsoleAchievement[];
  xpEvents: ConsoleXpEvent[];
};
