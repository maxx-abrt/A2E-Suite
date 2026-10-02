import {
  buildTemplateApplyUndoReport,
  groupCreatedRecordsByObject,
  undoTemplateApply,
  type TemplateApplyGroupDeleter,
  type TemplateApplyUndoGroup,
} from '@/template-gallery/utils/undoTemplateApply';
import { type TemplateApplyCreatedRecord } from 'twenty-shared/application';

const createdRecords: TemplateApplyCreatedRecord[] = [
  { object: 'project', id: 'project-1' },
  { object: 'task', id: 'task-1' },
  { object: 'task', id: 'task-2' },
  { object: 'milestone', id: 'milestone-1' },
];

describe('groupCreatedRecordsByObject', () => {
  it('groups the created set by object and preserves order', () => {
    expect(groupCreatedRecordsByObject(createdRecords)).toEqual([
      { object: 'project', ids: ['project-1'] },
      { object: 'task', ids: ['task-1', 'task-2'] },
      { object: 'milestone', ids: ['milestone-1'] },
    ]);
  });

  it('deduplicates an id echoed twice by an idempotent re-apply', () => {
    expect(
      groupCreatedRecordsByObject([
        { object: 'document', id: 'document-1' },
        { object: 'document', id: 'document-1' },
      ]),
    ).toEqual([{ object: 'document', ids: ['document-1'] }]);
  });

  it('drops records with an empty id', () => {
    expect(
      groupCreatedRecordsByObject([{ object: 'document', id: '   ' }]),
    ).toEqual([]);
  });
});

describe('undoTemplateApply', () => {
  it('removes exactly the operation created ids per object', async () => {
    const receivedGroups: TemplateApplyUndoGroup[] = [];
    const deleteGroup: TemplateApplyGroupDeleter = async (group) => {
      receivedGroups.push(group);

      return group.ids;
    };

    const report = await undoTemplateApply(createdRecords, deleteGroup);

    expect(receivedGroups).toEqual([
      { object: 'project', ids: ['project-1'] },
      { object: 'task', ids: ['task-1', 'task-2'] },
      { object: 'milestone', ids: ['milestone-1'] },
    ]);
    expect(report).toEqual({
      attempted: 4,
      deleted: 4,
      skipped: 0,
      failed: 0,
      outcomes: [
        {
          object: 'project',
          deletedIds: ['project-1'],
          skippedIds: [],
          failedIds: [],
        },
        {
          object: 'task',
          deletedIds: ['task-1', 'task-2'],
          skippedIds: [],
          failedIds: [],
        },
        {
          object: 'milestone',
          deletedIds: ['milestone-1'],
          skippedIds: [],
          failedIds: [],
        },
      ],
    });
  });

  it('skips ids the deleter no longer finds and reports them honestly', async () => {
    const deleteGroup: TemplateApplyGroupDeleter = async (group) =>
      group.object === 'task' ? ['task-1'] : group.ids;

    const report = await undoTemplateApply(createdRecords, deleteGroup);

    expect(report.deleted).toBe(3);
    expect(report.skipped).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.outcomes).toContainEqual({
      object: 'task',
      deletedIds: ['task-1'],
      skippedIds: ['task-2'],
      failedIds: [],
    });
  });

  it('fails only the group whose deleter throws and still processes the others', async () => {
    const deleteGroup: TemplateApplyGroupDeleter = async (group) => {
      if (group.object === 'task') {
        throw new Error('permission denied');
      }

      return group.ids;
    };

    const report = await undoTemplateApply(createdRecords, deleteGroup);

    expect(report.deleted).toBe(2);
    expect(report.failed).toBe(2);
    expect(report.outcomes).toContainEqual({
      object: 'task',
      deletedIds: [],
      skippedIds: [],
      failedIds: ['task-1', 'task-2'],
    });
  });

  it('is idempotent: a second run over the same set reports everything skipped', async () => {
    const firstDelete: TemplateApplyGroupDeleter = async (group) => group.ids;
    await undoTemplateApply(createdRecords, firstDelete);

    const secondDelete: TemplateApplyGroupDeleter = async () => [];
    const secondReport = await undoTemplateApply(createdRecords, secondDelete);

    expect(secondReport).toEqual({
      attempted: 4,
      deleted: 0,
      skipped: 4,
      failed: 0,
      outcomes: [
        {
          object: 'project',
          deletedIds: [],
          skippedIds: ['project-1'],
          failedIds: [],
        },
        {
          object: 'task',
          deletedIds: [],
          skippedIds: ['task-1', 'task-2'],
          failedIds: [],
        },
        {
          object: 'milestone',
          deletedIds: [],
          skippedIds: ['milestone-1'],
          failedIds: [],
        },
      ],
    });
  });

  it('returns an empty report for an apply that created nothing', async () => {
    const report = await undoTemplateApply([], async () => []);

    expect(report).toEqual({
      attempted: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
      outcomes: [],
    });
  });
});

describe('buildTemplateApplyUndoReport', () => {
  it('sums the per-object outcomes', () => {
    expect(
      buildTemplateApplyUndoReport([
        { object: 'project', deletedIds: ['a'], skippedIds: [], failedIds: [] },
        {
          object: 'task',
          deletedIds: ['b'],
          skippedIds: ['c'],
          failedIds: ['d', 'e'],
        },
      ]),
    ).toEqual({
      attempted: 5,
      deleted: 2,
      skipped: 1,
      failed: 2,
      outcomes: [
        { object: 'project', deletedIds: ['a'], skippedIds: [], failedIds: [] },
        {
          object: 'task',
          deletedIds: ['b'],
          skippedIds: ['c'],
          failedIds: ['d', 'e'],
        },
      ],
    });
  });
});
