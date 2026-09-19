// One reading of a task's pipeline status, shared by the P9.2 tools.
//
// The app's own `projectStatus` select is the authoritative pipeline
// (TODO / IN_PROGRESS / DONE), but tasks created outside the app may only
// carry the standard task `status`. Reading the app field first and falling
// back to the standard one keeps the two tools from disagreeing about whether
// a task is finished. An unrecognised value is `null` — never silently
// treated as DONE — so an unknown state can only ever under-report completion.

export const TASK_PIPELINE_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export type TaskPipelineStatus = (typeof TASK_PIPELINE_STATUSES)[number];

export type TaskStatusRecord = {
  status?: string | null;
  projectStatus?: string | null;
};

const isPipelineStatus = (value: string): value is TaskPipelineStatus =>
  (TASK_PIPELINE_STATUSES as readonly string[]).includes(value);

export const readTaskPipelineStatus = (
  record: TaskStatusRecord,
): TaskPipelineStatus | null => {
  const raw = record.projectStatus ?? record.status ?? null;

  return typeof raw === 'string' && isPipelineStatus(raw) ? raw : null;
};

export const isTaskDone = (record: TaskStatusRecord): boolean =>
  readTaskPipelineStatus(record) === 'DONE';
