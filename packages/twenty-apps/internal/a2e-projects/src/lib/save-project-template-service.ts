import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildSaveProjectAsTemplatePayload,
  type SourceProject,
} from './save-project-as-template.ts';

// M9b record-action mount (US-137): promote the project the user is looking at
// (and its tasks) to a workspace template, one click from the record surface.
//
// The write path every record action shares: read the selected source, run the
// US-119 payload builder, persist a FRESH template project plus fresh task rows.
// The template is a copy, never the source rows, so editing the source (or a
// later instance) can never write back to it (C1). Client-injected so the node
// unit runner can exercise the path without a live workspace; the front
// component supplies CoreApiClient.
//
// The task snapshot mirrors the install seeder's `createStarterProject`: the
// template carries the task list (title + board status), not the source task
// ids or their live links. Milestones are intentionally absent — the M9b data
// model snapshots the project and its tasks.

export type SaveProjectTemplateClient = Pick<
  CoreApiClient,
  'query' | 'mutation'
>;

type ProjectTaskNode = {
  id: string;
  title: string;
  projectStatus?: string | null;
};

type SourceProjectQueryResult = {
  project?: {
    name: string;
    key?: string | null;
    status?: string | null;
    health?: string | null;
    description?: { markdown?: string | null } | null;
    tasks?: { edges?: { node: ProjectTaskNode }[] } | null;
  } | null;
};

export type CreatedProjectTemplate = {
  projectId: string;
  taskIds: string[];
};

export const saveProjectAsTemplate = async (
  client: SaveProjectTemplateClient,
  projectId: string,
): Promise<CreatedProjectTemplate | null> => {
  const result = (await client.query({
    project: {
      __args: { filter: { id: { eq: projectId } } },
      name: true,
      key: true,
      status: true,
      health: true,
      description: { markdown: true },
      tasks: {
        edges: {
          node: { id: true, title: true, projectStatus: true },
        },
      },
    },
  } as never)) as SourceProjectQueryResult;

  const source = result?.project ?? null;

  // Fail closed: an unreadable source creates no template.
  if (source === null) {
    return null;
  }

  const sourceProject: SourceProject = {
    name: source.name,
    key: source.key ?? null,
    status: source.status ?? null,
    health: source.health ?? null,
    description: { markdown: source.description?.markdown ?? null },
    tasks: (source.tasks?.edges ?? []).map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      projectStatus: edge.node.projectStatus ?? null,
    })),
  };

  const payload = buildSaveProjectAsTemplatePayload(sourceProject);

  const projectResult = (await client.mutation({
    createProjects: {
      __args: {
        data: [
          {
            name: payload.project.name,
            key: payload.project.key,
            status: payload.project.status,
            health: payload.project.health,
            description: { markdown: payload.project.description.markdown },
            isTemplate: true,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createProjects?: { id?: string }[] };

  const createdProjectId = projectResult?.createProjects?.[0]?.id ?? null;

  if (createdProjectId === null) {
    return { projectId: '', taskIds: [] };
  }

  if (payload.tasks.length === 0) {
    return { projectId: createdProjectId, taskIds: [] };
  }

  const tasksResult = (await client.mutation({
    createTasks: {
      __args: {
        data: payload.tasks.map((task) => ({
          title: task.title,
          projectStatus: task.projectStatus,
          projectId: createdProjectId,
          position: 'last',
        })),
      },
      id: true,
    },
  } as never)) as { createTasks?: { id: string }[] };

  return {
    projectId: createdProjectId,
    taskIds: (tasksResult?.createTasks ?? []).map((task) => task.id),
  };
};
