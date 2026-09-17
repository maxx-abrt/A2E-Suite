// Pure rules of the task human-id contract ("<KEY>-<n>"), kept out of the
// logic function so node:test can exercise them without importing
// twenty-sdk/define. The counter is the last n attributed and lives on the
// project row: the number is minted once and never recomputed, so deleting a
// task leaves a gap instead of renumbering a surviving one.

export const TASK_HUMAN_ID_MAX_ATTEMPTS = 10;

export type TaskHumanIdSource = {
  key?: string | null;
  taskCounter?: number | null;
};

export type TaskHumanIdTarget = {
  id: string;
  humanId?: string | null;
  projectId?: string | null;
  project?: { id?: string | null } | null;
};

export const hasTaskHumanId = (task: TaskHumanIdTarget): boolean =>
  typeof task.humanId === 'string' && task.humanId.length > 0;

// Database event payloads carry the join column (`projectId`); a Core API
// read can carry the relation (`project { id }`). Both are project joins.
export const readTaskProjectId = (
  task: TaskHumanIdTarget,
): string | undefined => {
  const projectId = task.project?.id ?? task.projectId;

  return typeof projectId === 'string' && projectId.length > 0
    ? projectId
    : undefined;
};

// A NUMBER read through the Core API can come back missing or malformed (a
// project seeded before the field existed, a hand-cleared row), so the
// allocator normalizes to "no task joined yet" instead of allocating NaN.
export const readTaskCounter = (project: TaskHumanIdSource): number => {
  const counter = project.taskCounter;

  return typeof counter === 'number' &&
    Number.isInteger(counter) &&
    counter > 0
    ? counter
    : 0;
};

export const computeTaskHumanId = (
  projectKey: string,
  sequence: number,
): string => `${projectKey}-${sequence}`;
