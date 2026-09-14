import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  findMissingStarterProjects,
  resolveMilestoneDueAt,
  type StarterProjectTemplate,
} from '../lib/starter-projects.ts';

// INSTALL = READY TO USE.
//
// Installing A2E Projects must leave a workspace with two immediately usable
// projects (livraison + rétroplanning d'événement), their tasks on the board
// and milestones on the calendar. Every step is idempotent, because an app
// can be reinstalled.

const coreClient = (): CoreApiClient => new CoreApiClient();

// Delta by the project `key` (not name): the key is the short unique marker
// the human-id counter prints on tasks, so it is the stable provenance check.
const findExistingProjectKeys = async (
  client: CoreApiClient,
): Promise<string[]> => {
  const result = (await client.query({
    projects: {
      __args: { first: 30 },
      edges: { node: { key: true } },
    },
  } as never)) as {
    projects?: { edges: { node: { key?: string | null } }[] };
  };

  return (result?.projects?.edges ?? [])
    .map((edge) => edge.node.key)
    .filter((key): key is string => typeof key === 'string');
};

const createStarterProject = async (
  client: CoreApiClient,
  starterProject: StarterProjectTemplate,
  now: Date,
): Promise<void> => {
  const result = (await client.mutation({
    createProjects: {
      __args: {
        data: [
          {
            name: starterProject.name,
            key: starterProject.key,
            status: starterProject.status,
            health: starterProject.health,
            description: starterProject.description,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createProjects?: { id: string }[] };

  const projectId = result?.createProjects?.[0]?.id;

  if (projectId === undefined) {
    return;
  }

  // Tasks and milestones are created after the project so the board opens
  // populated on first visit. Relation FKs go through the join-column scalar
  // (same payload shape as the ledger writer in a2e-accounting).
  const tasks = starterProject.tasks;

  if (tasks.length > 0) {
    await client.mutation({
      createTasks: {
        __args: {
          data: tasks.map((starterTask) => ({
            title: starterTask.title,
            position: 'V',
            projectId,
            projectStatus: starterTask.projectStatus,
          })),
        },
        id: true,
      },
    } as never);
  }

  const milestones = starterProject.milestones;

  if (milestones.length > 0) {
    await client.mutation({
      createMilestones: {
        __args: {
          data: milestones.map((starterMilestone) => ({
            name: starterMilestone.name,
            dueAt: resolveMilestoneDueAt(starterMilestone.dueInDays, now),
            projectId,
          })),
        },
        id: true,
      },
    } as never);
  }
};

const handler = async () => {
  const client = coreClient();
  const now = new Date();

  const existingProjectKeys = await findExistingProjectKeys(client);
  const missingProjects = findMissingStarterProjects(existingProjectKeys);

  for (const starterProject of missingProjects) {
    await createStarterProject(client, starterProject, now);
  }

  console.log('[a2e-projects] Installation terminée', {
    starterProjectsCreated: missingProjects.length,
  });

  return {
    starterProjectsCreated: missingProjects.length,
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare A2E Projects : projets de démarrage (livraison, rétroplanning d’événement) avec leurs tâches et jalons.',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
