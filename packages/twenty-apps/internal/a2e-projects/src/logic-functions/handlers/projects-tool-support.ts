import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared plumbing for the two read-only P9.2 Projects tools. Both read the
// standard `task` object (with the app's `projectStatus` / `parentTask` fields)
// and the app's `milestone` object through the caller-context Core API client,
// so the platform hides records the caller cannot read. Centralizing the reads
// keeps the two tools from drifting on selection or ordering.
//
// The client is injectable so node:test exercises the reads without a live Core
// API (the generated client throws before generation).
//
// The reads are bounded: a standup digest and a breakdown context are small
// projections, and an unbounded scan of a busy workspace would be a heavier
// query than the answer is worth.

export type CoreClientLike = Pick<CoreApiClient, 'query'>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

export const MAX_PROJECT_TASKS_SCANNED = 500;
export const MAX_PROJECT_MILESTONES_SCANNED = 200;

const TASK_SELECTION = {
  id: true,
  title: true,
  dueAt: true,
  status: true,
  projectStatus: true,
  createdAt: true,
  updatedAt: true,
  parentTask: { id: true },
} as const;

const MILESTONE_SELECTION = {
  id: true,
  name: true,
  dueAt: true,
  doneAt: true,
} as const;

export type ProjectsTaskRecord = {
  id: string;
  title?: string | null;
  dueAt?: string | null;
  status?: string | null;
  projectStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  parentTask?: { id?: string | null } | null;
  parentTaskId?: string | null;
  subtaskId?: string | null;
};

export type ProjectsMilestoneRecord = {
  id: string;
  name?: string | null;
  dueAt?: string | null;
  doneAt?: string | null;
};

type TasksQueryResult = {
  tasks?: { edges?: { node: ProjectsTaskRecord }[] };
};

type MilestonesQueryResult = {
  milestones?: { edges?: { node: ProjectsMilestoneRecord }[] };
};

// A project's tasks are filtered through the relation target id (`project
// { id }`), not the join column key — the same read the Gantt front component
// uses. With no projectId the digest scans the workspace, most-recently
// updated first so the window's activity is what survives the bound.
export const readProjectTasks = async ({
  client,
  projectId,
}: {
  client: CoreClientLike;
  projectId: string | null;
}): Promise<ProjectsTaskRecord[]> => {
  const result = (await client.query({
    tasks: {
      __args: {
        ...(projectId === null
          ? {}
          : { filter: { project: { id: { eq: projectId } } } }),
        orderBy: [{ updatedAt: 'DescNullsLast' }, { id: 'AscNullsFirst' }],
        first: MAX_PROJECT_TASKS_SCANNED,
      },
      edges: { node: TASK_SELECTION },
    },
  } as never)) as TasksQueryResult;

  return (result?.tasks?.edges ?? []).map((edge) => edge.node);
};

export const readProjectMilestones = async ({
  client,
  projectId,
}: {
  client: CoreClientLike;
  projectId: string;
}): Promise<ProjectsMilestoneRecord[]> => {
  const result = (await client.query({
    milestones: {
      __args: {
        filter: { project: { id: { eq: projectId } } },
        orderBy: [{ dueAt: 'AscNullsLast' }, { id: 'AscNullsFirst' }],
        first: MAX_PROJECT_MILESTONES_SCANNED,
      },
      edges: { node: MILESTONE_SELECTION },
    },
  } as never)) as MilestonesQueryResult;

  return (result?.milestones?.edges ?? []).map((edge) => edge.node);
};

// A tool input is JSON: an optional string filter is either absent, a
// non-blank string, or a caller mistake. A provided-but-blank value is refused
// rather than silently treated as "no filter".
export const readOptionalToolFilter = (
  value: unknown,
): { valid: true; value: string | null } | { valid: false } => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return { valid: false };
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return { valid: false };
  }

  return { valid: true, value: trimmed };
};
