import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  resolveMilestoneDueAt,
  type StarterProjectTemplate,
} from './starter-projects.ts';

// Starter-project instantiation, extracted from the install seeder so the M9a-3
// gallery apply (US-131) reuses the exact same write path — one project, its
// tasks on the board and its milestones on the calendar (C1: a template's live
// links never travel, only its layout and task snapshot do).
//
// Payload construction and the writes stay client-injected so the app unit
// runner can exercise the path without a live workspace. `operationId`, when
// given, tags the created project with the apply's idempotency id.

export type StarterProjectClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type CreatedStarterProject = {
  projectId: string;
  taskIds: string[];
  milestoneIds: string[];
};

export const createStarterProject = async (
  client: StarterProjectClient,
  starterProject: StarterProjectTemplate,
  options: { now: Date; operationId?: string | null },
): Promise<CreatedStarterProject> => {
  const operationId = options.operationId ?? null;

  const result = (await client.mutation({
    createProjects: {
      __args: {
        data: [
          {
            name: starterProject.name,
            key: starterProject.key,
            status: starterProject.status,
            health: starterProject.health,
            // `description` is RICH_TEXT: the scalar string is a live-input
            // error ("Invalid object value"), the markdown arm is the shape.
            description: { markdown: starterProject.description },
            ...(operationId === null
              ? {}
              : { templateApplyOperationId: operationId }),
          },
        ],
      },
      id: true,
    },
  } as never)) as { createProjects?: { id: string }[] };

  const projectId = result?.createProjects?.[0]?.id;

  if (projectId === undefined) {
    return { projectId: '', taskIds: [], milestoneIds: [] };
  }

  // Tasks and milestones are created after the project so the board opens
  // populated on first visit. Relation FKs go through the join-column scalar
  // (same payload shape as the ledger writer in a2e-accounting).
  const tasks = starterProject.tasks;
  let taskIds: string[] = [];

  if (tasks.length > 0) {
    const tasksResult = (await client.mutation({
      createTasks: {
        __args: {
          data: tasks.map((starterTask) => ({
            title: starterTask.title,
            position: 'last',
            projectId,
            projectStatus: starterTask.projectStatus,
          })),
        },
        id: true,
      },
    } as never)) as { createTasks?: { id: string }[] };

    taskIds = (tasksResult?.createTasks ?? []).map((task) => task.id);
  }

  const milestones = starterProject.milestones;
  let milestoneIds: string[] = [];

  if (milestones.length > 0) {
    const milestonesResult = (await client.mutation({
      createMilestones: {
        __args: {
          data: milestones.map((starterMilestone) => ({
            name: starterMilestone.name,
            dueAt: resolveMilestoneDueAt(starterMilestone.dueInDays, options.now),
            projectId,
          })),
        },
        id: true,
      },
    } as never)) as { createMilestones?: { id: string }[] };

    milestoneIds = (milestonesResult?.createMilestones ?? []).map(
      (milestone) => milestone.id,
    );
  }

  return { projectId, taskIds, milestoneIds };
};
