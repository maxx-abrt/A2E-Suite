import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { createStarterProject } from '../lib/create-starter-project.ts';
import { findMissingStarterProjects } from '../lib/starter-projects.ts';

// INSTALL = READY TO USE.
//
// Installing A2E Projects must leave a workspace with twelve immediately
// usable projects (livraison, rétroplanning d'événement, sprint, contenu,
// recrutement, onboarding, refonte, semestre, AG, subvention, bugs,
// objectifs), their tasks on the board and milestones on the calendar. Every
// step is idempotent, because an app can be reinstalled. The project write path
// is shared with the M9a-3 gallery apply (`lib/create-starter-project.ts`).

const coreClient = (): CoreApiClient => new CoreApiClient();

// Delta by the project `key` (not name): the key is the short unique marker
// the human-id counter prints on tasks, so it is the stable provenance check.
const findExistingProjectKeys = async (
  client: CoreApiClient,
): Promise<string[]> => {
  // Page size must exceed the shipped bundle with headroom: a workspace with
  // many user projects could otherwise push a shipped key off the first page
  // under a newest-first ordering and the delta would re-seed a duplicate.
  const result = (await client.query({
    projects: {
      __args: { first: 200 },
      edges: { node: { key: true } },
    },
  } as never)) as {
    projects?: { edges: { node: { key?: string | null } }[] };
  };

  return (result?.projects?.edges ?? [])
    .map((edge) => edge.node.key)
    .filter((key): key is string => typeof key === 'string');
};

const handler = async () => {
  const client = coreClient();
  const now = new Date();

  const existingProjectKeys = await findExistingProjectKeys(client);
  const missingProjects = findMissingStarterProjects(existingProjectKeys);

  for (const starterProject of missingProjects) {
    await createStarterProject(client, starterProject, { now });
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
    'Prépare Bureau Projets : douze projets de démarrage (livraison, rétroplanning, sprint, contenu, recrutement, onboarding, refonte, semestre, AG, subvention, bugs, objectifs) avec leurs tâches et jalons.',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
