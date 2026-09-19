import {
  buildStandupDigest,
  resolveDigestWindowStart,
  type StandupDigest,
} from '../../lib/standup-digest.ts';
import {
  coreClient,
  readOptionalToolFilter,
  readProjectTasks,
  type CoreClientLike,
} from './projects-tool-support.ts';

// READ-ONLY STANDUP DIGEST (P9.2).
//
// Assembles "what moved" for a project or the whole workspace: tasks finished,
// created, still-open-but-edited and overdue since the window start. The
// activity source is the task rows themselves (createdAt / updatedAt / pipeline
// status) — deliberately not the P8 activity feed, so the tool stays a
// self-contained caller-scoped read. The window defaults to the previous local
// day. It never writes (C6): the digest is context, not an update.

export type StandupDigestInput = {
  sinceIso?: string;
  projectId?: string;
};

export type StandupDigestStatus = 'OK' | 'INVALID_INPUT';

export type StandupDigestResult = {
  status: StandupDigestStatus;
  projectId: string | null;
  digest: StandupDigest | null;
};

export const buildStandupDigestForAssistant = async (
  input: StandupDigestInput,
  client: CoreClientLike = coreClient(),
  now: Date = new Date(),
): Promise<StandupDigestResult> => {
  const projectId = readOptionalToolFilter(input.projectId);

  if (!projectId.valid) {
    return { status: 'INVALID_INPUT', projectId: null, digest: null };
  }

  const window = resolveDigestWindowStart(input.sinceIso, now);

  if (!window.valid) {
    return {
      status: 'INVALID_INPUT',
      projectId: projectId.value,
      digest: null,
    };
  }

  const tasks = await readProjectTasks({
    client,
    projectId: projectId.value,
  });

  return {
    status: 'OK',
    projectId: projectId.value,
    digest: buildStandupDigest({
      tasks,
      sinceIso: window.sinceIso,
      now,
    }),
  };
};
