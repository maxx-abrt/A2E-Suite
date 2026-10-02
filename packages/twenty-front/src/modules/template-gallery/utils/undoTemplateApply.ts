import { type TemplateApplyCreatedRecord } from 'twenty-shared/application';

// M13f — the "removes only what that operation created" contract for a template
// apply. The apply result carries the exact `created[]` set for the operation,
// so the undo is scoped to those ids and can never reach a pre-existing object
// (C1 boundary). Deleting is injected so the idempotency/degradation rules are
// exercised without Apollo: an id the deleter does not report back was already
// absent, and a deleter failure fails only that object's group.

export type TemplateApplyUndoGroup = {
  object: string;
  ids: string[];
};

export type TemplateApplyUndoGroupOutcome = {
  object: string;
  deletedIds: string[];
  skippedIds: string[];
  failedIds: string[];
};

export type TemplateApplyUndoReport = {
  attempted: number;
  deleted: number;
  skipped: number;
  failed: number;
  outcomes: TemplateApplyUndoGroupOutcome[];
};

export type TemplateApplyGroupDeleter = (
  group: TemplateApplyUndoGroup,
) => Promise<string[]>;

// Deduplicate within an object: an idempotent re-apply can echo the same root id
// more than once, and deleting it twice would inflate the deleted count.
export const groupCreatedRecordsByObject = (
  created: TemplateApplyCreatedRecord[],
): TemplateApplyUndoGroup[] => {
  const idsByObject = new Map<string, string[]>();

  created.forEach((record) => {
    const id = record.id.trim();

    if (id === '') {
      return;
    }

    const ids = idsByObject.get(record.object) ?? [];

    if (!ids.includes(id)) {
      ids.push(id);
    }

    idsByObject.set(record.object, ids);
  });

  return [...idsByObject.entries()].map(([object, ids]) => ({ object, ids }));
};

export const buildTemplateApplyUndoReport = (
  outcomes: TemplateApplyUndoGroupOutcome[],
): TemplateApplyUndoReport => {
  const totals = outcomes.reduce(
    (accumulator, outcome) => ({
      deleted: accumulator.deleted + outcome.deletedIds.length,
      skipped: accumulator.skipped + outcome.skippedIds.length,
      failed: accumulator.failed + outcome.failedIds.length,
    }),
    { deleted: 0, skipped: 0, failed: 0 },
  );

  return {
    attempted: totals.deleted + totals.skipped + totals.failed,
    ...totals,
    outcomes,
  };
};

export const undoTemplateApply = async (
  created: TemplateApplyCreatedRecord[],
  deleteGroup: TemplateApplyGroupDeleter,
): Promise<TemplateApplyUndoReport> => {
  const groups = groupCreatedRecordsByObject(created);
  const outcomes: TemplateApplyUndoGroupOutcome[] = [];

  for (const group of groups) {
    let deletedIds: string[] = [];
    let failedIds: string[] = [];

    try {
      const reportedDeletedIds = await deleteGroup(group);

      deletedIds = group.ids.filter((id) => reportedDeletedIds.includes(id));
    } catch {
      // A permission refusal or a transport error fails the whole group rather
      // than pretending the rows are gone — the report stays honest.
      failedIds = group.ids;
    }

    const skippedIds = group.ids.filter(
      (id) => !deletedIds.includes(id) && !failedIds.includes(id),
    );

    outcomes.push({ object: group.object, deletedIds, skippedIds, failedIds });
  }

  return buildTemplateApplyUndoReport(outcomes);
};
