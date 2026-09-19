// Pure assembly of the P9.2 task-breakdown context.
//
// This is the context an assistant needs to PROPOSE a breakdown: the project's
// task forest (roots and children through the `parentTask` self-relation),
// its milestones with their dates, and the pipeline status counts. It proposes
// nothing itself — no candidate task is invented here; suggestions are the
// assistant's, rendered from this typed shape.
//
// Tree nesting reuses the verified `nestTaskTree` from `task-tree.ts` (cycle
// breaking, orphan promotion) rather than growing a second forest builder.

import {
  nestTaskTree,
  type TaskTreeNode,
  type TaskTreeRecord,
} from './task-tree.ts';
import {
  readTaskPipelineStatus,
  type TaskPipelineStatus,
  type TaskStatusRecord,
} from './task-status.ts';

export type BreakdownTaskRecord = TaskTreeRecord & TaskStatusRecord;

export type BreakdownMilestoneRecord = {
  id: string;
  name?: string | null;
  dueAt?: string | null;
  doneAt?: string | null;
};

export type BreakdownMilestone = {
  id: string;
  name: string | null;
  dueAt: string | null;
  doneAt: string | null;
};

export type TaskPipelineStatusCounts = Record<TaskPipelineStatus, number> & {
  UNKNOWN: number;
};

export type TaskBreakdownContext = {
  taskCount: number;
  statusCounts: TaskPipelineStatusCounts;
  roots: TaskTreeNode[];
  milestones: BreakdownMilestone[];
};

export const countTasksByPipelineStatus = (
  tasks: TaskStatusRecord[],
): TaskPipelineStatusCounts => {
  const counts: TaskPipelineStatusCounts = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    UNKNOWN: 0,
  };

  for (const task of tasks) {
    const status = readTaskPipelineStatus(task);

    if (status === null) {
      counts.UNKNOWN += 1;
    } else {
      counts[status] += 1;
    }
  }

  return counts;
};

const toBreakdownMilestone = (
  record: BreakdownMilestoneRecord,
): BreakdownMilestone => ({
  id: record.id,
  name: record.name ?? null,
  dueAt: record.dueAt ?? null,
  doneAt: record.doneAt ?? null,
});

export const buildTaskBreakdownContext = ({
  tasks,
  milestones,
}: {
  tasks: BreakdownTaskRecord[];
  milestones: BreakdownMilestoneRecord[];
}): TaskBreakdownContext => ({
  taskCount: tasks.length,
  statusCounts: countTasksByPipelineStatus(tasks),
  roots: nestTaskTree(tasks),
  milestones: milestones.map(toBreakdownMilestone),
});
