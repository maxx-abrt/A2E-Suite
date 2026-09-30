// Workspace project templates (PLAN M9b).
//
// The reverse of a starter/descriptor instantiation: promote an existing
// project — together with the tasks that belong to it — to a reusable
// workspace template. Payload construction only: the caller owns persistence,
// so editing a copy never mutates the template and deleting the template never
// touches existing instances (C1: fresh rows, no aliasing).
//
// One implementation pattern, shared with a2e-documents'
// save-document-as-template.ts: a prefix-once title helper, one persisted
// marker (`isTemplate` on the existing project object), and fresh nested
// identities minted in the instantiate direction.

export const PROJECT_TEMPLATE_TITLE_PREFIX = 'Modèle — ';

const FALLBACK_PROJECT_TITLE = 'Nouveau projet';

// Task ids are the nested identities a project template carries: the copy must
// re-key them and every internal relation (subtask parent, milestone link,
// blocked-by edges) that points at them, or the copy would alias the template.
export type SourceProjectTask = {
  id?: string | null;
  title: string;
  projectStatus?: string | null;
  parentTaskId?: string | null;
  milestoneId?: string | null;
  blockedByTaskIds?: string[] | null;
};

export type SourceProject = {
  name: string;
  key?: string | null;
  status?: string | null;
  health?: string | null;
  description?: { markdown?: string | null } | null;
  tasks?: SourceProjectTask[] | null;
};

export type ProjectTemplateTaskPayload = {
  sourceId: string | null;
  title: string;
  projectStatus: string | null;
  parentTaskSourceId: string | null;
  milestoneSourceId: string | null;
  blockedByTaskSourceIds: string[];
};

export type ProjectTemplateProjectPayload = {
  name: string;
  key: string | null;
  status: string | null;
  health: string | null;
  description: { markdown: string | null };
  isTemplate: true;
};

export type SaveProjectAsTemplatePayload = {
  project: ProjectTemplateProjectPayload;
  tasks: ProjectTemplateTaskPayload[];
};

export type InstantiatedProjectPayload = {
  project: {
    name: string;
    key: string | null;
    status: string | null;
    health: string | null;
    description: { markdown: string | null };
    isTemplate: false;
  };
  tasks: {
    id: string;
    projectId: string;
    title: string;
    projectStatus: string | null;
    parentTaskId: string | null;
    milestoneId: string | null;
    blockedByTaskIds: string[];
  }[];
};

const createRandomId = (): string => {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;

  if (typeof cryptoLike?.randomUUID === 'function') {
    return cryptoLike.randomUUID();
  }

  return `task-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

// An already-prefixed title stays unchanged, so promoting a template-shaped
// project never doubles the prefix.
export const buildSaveProjectAsTemplateTitle = (
  sourceName: string,
): string => {
  const trimmedName = sourceName.trim();

  if (trimmedName === '') {
    return `${PROJECT_TEMPLATE_TITLE_PREFIX}${FALLBACK_PROJECT_TITLE}`;
  }

  if (trimmedName.startsWith(PROJECT_TEMPLATE_TITLE_PREFIX)) {
    return trimmedName;
  }

  return `${PROJECT_TEMPLATE_TITLE_PREFIX}${trimmedName}`;
};

export const buildProjectTemplateCopyTitle = (
  templateName: string,
): string => {
  const strippedName = templateName.startsWith(PROJECT_TEMPLATE_TITLE_PREFIX)
    ? templateName.slice(PROJECT_TEMPLATE_TITLE_PREFIX.length).trim()
    : templateName.trim();

  return strippedName === '' ? FALLBACK_PROJECT_TITLE : strippedName;
};

// Relations and system fields (id, lead, company, documents, archivedAt,
// budget, spent, recipeCorrelationKey) are intentionally absent: a template's
// live links and provenance never travel into a copy, only its layout and the
// task snapshot do. The task ids are kept under `sourceId` so instantiation can
// remap the task-to-task relations.
export const buildSaveProjectAsTemplatePayload = (
  sourceProject: SourceProject,
): SaveProjectAsTemplatePayload => ({
  project: {
    name: buildSaveProjectAsTemplateTitle(sourceProject.name),
    key: sourceProject.key ?? null,
    status: sourceProject.status ?? null,
    health: sourceProject.health ?? null,
    description: { markdown: sourceProject.description?.markdown ?? null },
    isTemplate: true,
  },
  tasks: (sourceProject.tasks ?? []).map((task) => ({
    sourceId: task.id ?? null,
    title: task.title,
    projectStatus: task.projectStatus ?? null,
    parentTaskSourceId: task.parentTaskId ?? null,
    milestoneSourceId: task.milestoneId ?? null,
    blockedByTaskSourceIds: [...(task.blockedByTaskIds ?? [])],
  })),
});

// Instantiate direction: the copy is a fresh, non-template project and every
// task is a fresh row. Each source task id is re-keyed, then every internal
// relation is rewritten through the map — an unknown reference is dropped
// rather than pointed at a template row. The caller creates the fresh project
// first and passes its id so each task links to the copy, never to the
// template.
export const buildProjectFromTemplatePayload = (
  template: SaveProjectAsTemplatePayload,
  options: { projectId: string; createTaskId?: () => string },
): InstantiatedProjectPayload => {
  const createTaskId = options.createTaskId ?? createRandomId;
  const taskIdBySourceId = new Map<string, string>();
  const assignedTaskIds = new Set<string>();

  for (const task of template.tasks) {
    if (task.sourceId === null || task.sourceId === '') {
      continue;
    }

    let candidate = createTaskId();

    while (candidate === '' || assignedTaskIds.has(candidate)) {
      candidate = createTaskId();
    }

    assignedTaskIds.add(candidate);
    taskIdBySourceId.set(task.sourceId, candidate);
  }

  const remapSourceId = (sourceId: string | null): string | null =>
    sourceId === null ? null : (taskIdBySourceId.get(sourceId) ?? null);

  return {
    project: {
      name: buildProjectTemplateCopyTitle(template.project.name),
      key: template.project.key,
      status: template.project.status,
      health: template.project.health,
      description: { markdown: template.project.description.markdown },
      isTemplate: false,
    },
    tasks: template.tasks.map((task) => ({
      id:
        task.sourceId === null
          ? createTaskId()
          : (taskIdBySourceId.get(task.sourceId) as string),
      projectId: options.projectId,
      title: task.title,
      projectStatus: task.projectStatus,
      parentTaskId: remapSourceId(task.parentTaskSourceId),
      milestoneId: task.milestoneSourceId,
      blockedByTaskIds: task.blockedByTaskSourceIds
        .map((sourceId) => remapSourceId(sourceId))
        .filter((id): id is string => id !== null),
    })),
  };
};
