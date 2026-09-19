// Pure assembly of the P9.2 standup digest.
//
// The digest is a projection over project/task rows the assistant already has
// access to: the caller passes the records read under its auth context, and
// this module decides the window classification. It stays free of the SDK so
// node:test can pin every boundary without a running server.
//
// There is no `completedAt` on the native task object, so "completed in the
// window" is the current DONE state combined with an `updatedAt` inside the
// window: an update is the only timestamp that can attest a completion. The
// classification is explicit and disjoint per fact — a task created and
// finished in the window is reported as both `created` and `completed`
// (those are two different standup facts), while `updated` lists only the
// still-open tasks whose content moved, so a task is never reported twice as
// "updated" and "created".

import { isTaskDone } from './task-status.ts';

export const DEFAULT_DIGEST_LOOKBACK_DAYS = 1;

export type DigestTaskRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  projectStatus?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type StandupDigestTask = {
  id: string;
  title: string | null;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StandupDigest = {
  sinceIso: string;
  nowIso: string;
  completed: StandupDigestTask[];
  created: StandupDigestTask[];
  updated: StandupDigestTask[];
  overdue: StandupDigestTask[];
};

export type DigestWindowResolution =
  | { valid: true; sinceIso: string }
  | { valid: false };

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const timestampMs = Date.parse(value);

  return Number.isNaN(timestampMs) ? null : timestampMs;
};

// Default window: the start of the previous LOCAL day. The digest is a standup
// aid, so "yesterday" means the caller-facing day boundary, not the UTC one.
export const resolveDigestWindowStart = (
  sinceIso: string | null | undefined,
  now: Date,
): DigestWindowResolution => {
  if (sinceIso === undefined || sinceIso === null) {
    const start = new Date(now);

    start.setDate(start.getDate() - DEFAULT_DIGEST_LOOKBACK_DAYS);
    start.setHours(0, 0, 0, 0);

    return { valid: true, sinceIso: start.toISOString() };
  }

  const timestampMs = parseTimestamp(sinceIso);

  if (timestampMs === null) {
    return { valid: false };
  }

  return { valid: true, sinceIso: new Date(timestampMs).toISOString() };
};

const toDigestTask = (record: DigestTaskRecord): StandupDigestTask => ({
  id: record.id,
  title: record.title ?? null,
  dueAt: record.dueAt ?? null,
  createdAt: record.createdAt ?? null,
  updatedAt: record.updatedAt ?? null,
});

const isWithinWindow = (
  timestampMs: number | null,
  sinceMs: number,
  nowMs: number,
): boolean =>
  timestampMs !== null && timestampMs >= sinceMs && timestampMs <= nowMs;

export const buildStandupDigest = ({
  tasks,
  sinceIso,
  now,
}: {
  tasks: DigestTaskRecord[];
  sinceIso: string;
  now: Date;
}): StandupDigest => {
  const sinceMs = Date.parse(sinceIso);
  const nowMs = now.getTime();

  const completed: StandupDigestTask[] = [];
  const created: StandupDigestTask[] = [];
  const updated: StandupDigestTask[] = [];
  const overdue: StandupDigestTask[] = [];

  for (const task of tasks) {
    const updatedAtMs = parseTimestamp(task.updatedAt);
    const createdAtMs = parseTimestamp(task.createdAt);
    const dueAtMs = parseTimestamp(task.dueAt);
    const taskDone = isTaskDone(task);
    const createdInWindow = isWithinWindow(createdAtMs, sinceMs, nowMs);

    if (taskDone && isWithinWindow(updatedAtMs, sinceMs, nowMs)) {
      completed.push(toDigestTask(task));
    }

    if (createdInWindow) {
      created.push(toDigestTask(task));
    }

    if (
      !taskDone &&
      !createdInWindow &&
      isWithinWindow(updatedAtMs, sinceMs, nowMs)
    ) {
      updated.push(toDigestTask(task));
    }

    if (!taskDone && dueAtMs !== null && dueAtMs < nowMs) {
      overdue.push(toDigestTask(task));
    }
  }

  return {
    sinceIso,
    nowIso: now.toISOString(),
    completed,
    created,
    updated,
    overdue,
  };
};
