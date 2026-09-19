import {
  buildTaskBreakdownContext,
  type TaskBreakdownContext,
} from '../../lib/task-breakdown-context.ts';
import {
  coreClient,
  readOptionalToolFilter,
  readProjectMilestones,
  readProjectTasks,
  type CoreClientLike,
} from './projects-tool-support.ts';

// READ-ONLY TASK-BREAKDOWN CONTEXT (P9.2).
//
// Returns the typed context an assistant needs to PROPOSE a breakdown: the
// project's task forest (roots + children through `parentTask`), the milestones
// with their dates, and the pipeline status counts. The tool proposes nothing
// itself — no candidate task is created or invented here (C6); the assistant
// renders suggestions from this shape. Reads run under the caller's auth
// context.

export type TaskBreakdownContextInput = {
  projectId?: string;
};

export type TaskBreakdownContextStatus = 'OK' | 'INVALID_INPUT';

export type TaskBreakdownContextResult = {
  status: TaskBreakdownContextStatus;
  projectId: string | null;
  context: TaskBreakdownContext | null;
};

export const buildTaskBreakdownContextForAssistant = async (
  input: TaskBreakdownContextInput,
  client: CoreClientLike = coreClient(),
): Promise<TaskBreakdownContextResult> => {
  const projectId = readOptionalToolFilter(input.projectId);

  if (!projectId.valid || projectId.value === null) {
    return {
      status: 'INVALID_INPUT',
      projectId: projectId.valid ? projectId.value : null,
      context: null,
    };
  }

  const [tasks, milestones] = await Promise.all([
    readProjectTasks({ client, projectId: projectId.value }),
    readProjectMilestones({ client, projectId: projectId.value }),
  ]);

  return {
    status: 'OK',
    projectId: projectId.value,
    context: buildTaskBreakdownContext({ tasks, milestones }),
  };
};
