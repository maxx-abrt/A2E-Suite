import {
  type RetroplanningChangeSet,
  type RetroplanningPreview,
  type RetroplanningRecipe,
  type RetroplanningWarningCode,
} from './retroplanning.ts';

// L'ÉCRAN DE RÉTROPLANNING — pure helpers.
//
// The screen shows the dry-run of the same engine the logic function runs
// (buildRetroplanningPreview + reconcileRetroplanningDraft): one row per recipe
// task with its dates, dependencies, role and what confirming would do to it.
// Nothing here schedules; it only shapes the engine output for display.

export type RetroplanningRowAction =
  | 'CREATE'
  | 'UPDATE'
  | 'UNCHANGED'
  | 'PROTECTED_MANUAL'
  | 'PROTECTED_COMPLETED';

export type RetroplanningPreviewRow = {
  key: string;
  title: string;
  depth: number;
  durationDays: number;
  startAt: string;
  dueAt: string;
  dependsOnTitles: string[];
  assigneeRole?: string;
  action: RetroplanningRowAction;
  warningCodes: RetroplanningWarningCode[];
};

export type RetroplanningChangeSummary = {
  create: number;
  update: number;
  protected: number;
  remove: number;
};

export const RETROPLANNING_ROW_ACTION_LABELS: Record<
  RetroplanningRowAction,
  string
> = {
  CREATE: 'Nouvelle',
  UPDATE: 'Replanifiée',
  UNCHANGED: 'Inchangée',
  PROTECTED_MANUAL: 'Protégée (date modifiée)',
  PROTECTED_COMPLETED: 'Protégée (terminée)',
};

const RETROPLANNING_ROLE_LABELS: Record<string, string> = {
  lead: 'Responsable',
  team: 'Équipe',
  quality: 'Qualité',
  logistics: 'Logistique',
  communication: 'Communication',
};

export const getRetroplanningRoleLabel = (role: string): string =>
  RETROPLANNING_ROLE_LABELS[role] ?? role;

// Roles in first-use order, so the assignment form follows the plan.
export const collectRetroplanningAssigneeRoles = (
  recipe: RetroplanningRecipe,
): string[] => {
  const roles: string[] = [];

  for (const task of recipe.tasks) {
    const role = task.assigneeRole?.trim();

    if (role !== undefined && role !== '' && !roles.includes(role)) {
      roles.push(role);
    }
  }

  return roles;
};

const computeDepth = (
  key: string,
  parentKeyByKey: Map<string, string | undefined>,
): number => {
  let depth = 0;
  let parentKey = parentKeyByKey.get(key);
  const visited = new Set<string>([key]);

  while (parentKey !== undefined && !visited.has(parentKey)) {
    if (!parentKeyByKey.has(parentKey)) {
      break;
    }

    visited.add(parentKey);
    depth += 1;
    parentKey = parentKeyByKey.get(parentKey);
  }

  return depth;
};

const resolveRowAction = (
  key: string,
  changeSet: RetroplanningChangeSet,
): RetroplanningRowAction => {
  if (changeSet.create.some((task) => task.key === key)) {
    return 'CREATE';
  }

  const protectedEntry = changeSet.protected.find((entry) => entry.key === key);

  if (protectedEntry !== undefined) {
    return protectedEntry.reason === 'COMPLETED'
      ? 'PROTECTED_COMPLETED'
      : 'PROTECTED_MANUAL';
  }

  if (changeSet.update.some((update) => update.key === key)) {
    return 'UPDATE';
  }

  return 'UNCHANGED';
};

// Chronological rows (start, then due, then recipe order) so the table reads
// as a countdown to the deadline.
export const buildRetroplanningPreviewRows = (
  preview: RetroplanningPreview,
  changeSet: RetroplanningChangeSet,
): RetroplanningPreviewRow[] => {
  const titleByKey = new Map<string, string>(
    preview.tasks.map((task): [string, string] => [task.key, task.title]),
  );
  const parentKeyByKey = new Map<string, string | undefined>(
    preview.tasks.map((task): [string, string | undefined] => [
      task.key,
      task.parentKey,
    ]),
  );
  const orderByKey = new Map<string, number>(
    preview.tasks.map((task, index): [string, number] => [task.key, index]),
  );

  const rows = preview.tasks.map((task): RetroplanningPreviewRow => {
    const warningCodes = [
      ...new Set(
        preview.warnings
          .filter((warning) => warning.taskKeys.includes(task.key))
          .map((warning) => warning.code),
      ),
    ];

    return {
      key: task.key,
      title: task.title,
      depth: computeDepth(task.key, parentKeyByKey),
      durationDays: task.durationDays,
      startAt: task.startAt,
      dueAt: task.dueAt,
      dependsOnTitles: task.dependsOn.map(
        (dependencyKey) => titleByKey.get(dependencyKey) ?? dependencyKey,
      ),
      ...(task.assigneeRole === undefined
        ? {}
        : { assigneeRole: task.assigneeRole }),
      action: resolveRowAction(task.key, changeSet),
      warningCodes,
    };
  });

  return rows.sort((first, second) => {
    const startComparison =
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime();

    if (startComparison !== 0) {
      return startComparison;
    }

    const dueComparison =
      new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime();

    if (dueComparison !== 0) {
      return dueComparison;
    }

    return (orderByKey.get(first.key) ?? 0) - (orderByKey.get(second.key) ?? 0);
  });
};

export const summarizeRetroplanningChangeSet = (
  changeSet: RetroplanningChangeSet,
  pendingRemovalCount: number,
): RetroplanningChangeSummary => ({
  create: changeSet.create.length,
  update: changeSet.update.length,
  protected: changeSet.protected.length,
  remove: Math.max(changeSet.remove.length, pendingRemovalCount),
});

// Apply is only offered for the exact inputs that were previewed; any edit
// after the preview makes it stale and asks for a new preview first.
export const buildRetroplanningInputKey = (input: {
  projectId: string;
  recipeKey: string;
  deadline: { date: string; time?: string; timezone: string };
  mode: 'APPEND' | 'REPLACE';
  assigneeRoles?: Record<string, string>;
}): string =>
  JSON.stringify([
    input.projectId,
    input.recipeKey,
    input.deadline.date,
    input.deadline.time ?? '',
    input.deadline.timezone,
    input.mode,
    Object.entries(input.assigneeRoles ?? {})
      .filter(([, memberId]) => memberId !== '')
      .sort(([firstRole], [secondRole]) => firstRole.localeCompare(secondRole)),
  ]);

export const isValidRetroplanningTimezone = (timezone: string): boolean => {
  if (timezone.trim() === '') {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });

    return true;
  } catch {
    return false;
  }
};

// `YYYY-MM-DD` for the calendar day `daysAhead` days after `now` in `timezone`.
export const buildDefaultRetroplanningDeadlineDate = (
  now: Date,
  timezone: string,
  daysAhead: number,
): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const readPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  const target = new Date(
    Date.UTC(readPart('year'), readPart('month') - 1, readPart('day') + daysAhead),
  );

  return target.toISOString().slice(0, 10);
};

export const formatRetroplanningDay = (
  isoInstant: string,
  timezone: string,
  locale: string,
): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoInstant));
