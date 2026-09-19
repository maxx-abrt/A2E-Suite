import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createDealWonProject,
  type DealWonCreateProjectInput,
} from '../handlers/deal-won-create-project-handler.ts';
import { deriveDealWonCorrelationKey } from '../../lib/deal-won-recipe.ts';

// The handler runs against a stub Core API that enforces the same contract as
// the real client: `query` returns only rows matching the persisted
// correlation key and `createProjects` appends to the store. Running it twice
// with the same input therefore replays a real workflow retry, which is what
// the idempotency check must survive.

type ProjectRow = {
  id: string;
  name: string;
  key: string;
  recipeCorrelationKey: string;
  companyId?: string;
};

type CreatedProject = {
  name: string;
  key: string;
  recipeCorrelationKey: string;
  companyId?: string;
};

const buildClient = (initialProjects: ProjectRow[]) => {
  const projects = [...initialProjects];
  const created: CreatedProject[] = [];
  const filters: string[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.projects as {
        __args: { filter: { recipeCorrelationKey: { eq: string } } };
      };

      filters.push(entry.__args.filter.recipeCorrelationKey.eq);

      const match = projects.find(
        (project) =>
          project.recipeCorrelationKey ===
          entry.__args.filter.recipeCorrelationKey.eq,
      );

      return { projects: { edges: match ? [{ node: { id: match.id } }] : [] } };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createProjects as {
        __args: { data: CreatedProject[] };
      };
      const data = entry.__args.data[0];

      created.push(data);
      projects.push({ ...data, id: `created-${created.length}` });

      return { createProjects: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, projects, created, filters };
};

const input = (
  overrides: Partial<DealWonCreateProjectInput> = {},
): DealWonCreateProjectInput => ({
  opportunityId: 'opportunity-1',
  opportunityName: 'Refonte du site',
  companyId: 'company-1',
  workspaceId: 'workspace-1',
  ...overrides,
});

test('a won deal creates one project carrying the correlation key', async () => {
  const { client, created, filters } = buildClient([]);

  const result = await createDealWonProject(input(), client);
  const correlationKey = deriveDealWonCorrelationKey({
    opportunityId: 'opportunity-1',
    workspaceId: 'workspace-1',
  });

  assert.deepEqual(result, {
    status: 'CREATED',
    projectId: 'created-1',
    projectName: 'Refonte du site',
    correlationKey,
  });
  assert.deepEqual(created, [
    {
      name: 'Refonte du site',
      key: 'REFO',
      recipeCorrelationKey: correlationKey,
      companyId: 'company-1',
    },
  ]);
  assert.deepEqual(filters, [correlationKey]);
});

test('replaying the same trigger creates nothing and reports the existing project', async () => {
  const { client, projects, created } = buildClient([]);
  const first = await createDealWonProject(input(), client);
  const replay = await createDealWonProject(input(), client);

  assert.equal(first.status, 'CREATED');
  assert.deepEqual(replay, {
    status: 'ALREADY_EXISTS',
    projectId: first.projectId,
    projectName: 'Refonte du site',
    correlationKey: first.correlationKey,
  });
  assert.equal(projects.length, 1);
  assert.equal(created.length, 1);
});

test('two different opportunities produce two distinct projects', async () => {
  const { client, projects } = buildClient([]);

  await createDealWonProject(input(), client);
  await createDealWonProject(input({ opportunityId: 'opportunity-2' }), client);

  assert.equal(projects.length, 2);
  assert.notEqual(
    projects[0]?.recipeCorrelationKey,
    projects[1]?.recipeCorrelationKey,
  );
});

test('a blank opportunity id is refused before touching the Core API', async () => {
  const { client, created, filters } = buildClient([]);

  const result = await createDealWonProject(
    input({ opportunityId: '   ' }),
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(filters, []);
  assert.deepEqual(created, []);
});

test('a project without a company omits the company relation', async () => {
  const { client, created } = buildClient([]);

  await createDealWonProject(input({ companyId: null }), client);

  assert.equal(created[0]?.companyId, undefined);
});
