// Pure projection behind the project overview front component.
//
// The component is a thin renderer: it feeds the raw Core query counters and
// member rows here, and this module decides the health label and the member
// display names. Keeping it free of React and twenty-sdk is what lets
// node:test exercise the projection without a DOM or a running server. The
// health labels are duplicated from field-vocabulary on purpose — importing
// it would pull the define SDK into the sandbox bundle; the test asserts the
// two maps stay in sync.

export const PROJECT_HEALTH_LABELS = {
  ON_TRACK: 'Dans les temps',
  AT_RISK: 'À risque',
  OFF_TRACK: 'En difficulté',
} as const;

export const PROJECT_HEALTH_UNKNOWN_LABEL = 'Santé inconnue';

export const PROJECT_MEMBER_UNKNOWN_LABEL = 'Membre inconnu';

export type ProjectOverviewMember = {
  membershipId: string;
  role: string | null;
  displayName: string;
};

export type ProjectOverviewSummary = {
  healthLabel: string;
  taskCount: number;
  milestoneCount: number;
  activityCount: number;
  memberCount: number;
  members: ProjectOverviewMember[];
};

export type ProjectOverviewCounts = {
  health: string | null;
  taskCount: number;
  milestoneCount: number;
  activityCount: number;
  members: ProjectOverviewMember[];
};

export const formatProjectHealthLabel = (health: string | null): string => {
  if (health !== null && health in PROJECT_HEALTH_LABELS) {
    return PROJECT_HEALTH_LABELS[health as keyof typeof PROJECT_HEALTH_LABELS];
  }

  return PROJECT_HEALTH_UNKNOWN_LABEL;
};

export const formatWorkspaceMemberName = (
  name: { firstName?: string | null; lastName?: string | null } | null,
): string => {
  const parts = [name?.firstName, name?.lastName].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );

  return parts.length > 0 ? parts.join(' ') : PROJECT_MEMBER_UNKNOWN_LABEL;
};

export const buildProjectOverviewSummary = ({
  health,
  taskCount,
  milestoneCount,
  activityCount,
  members,
}: ProjectOverviewCounts): ProjectOverviewSummary => ({
  healthLabel: formatProjectHealthLabel(health),
  taskCount,
  milestoneCount,
  activityCount,
  memberCount: members.length,
  members,
});
