import { buildA2eLinkRecordInput } from '@/a2e-links/utils/buildA2eLinkRecordInput';

describe('buildA2eLinkRecordInput', () => {
  it('writes the junction row with both morph FKs and the dedup key', () => {
    expect(
      buildA2eLinkRecordInput({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      }),
    ).toEqual({
      linkKey: 'document:doc-1:task:task-1',
      linkType: 'USER_LINK',
      sourceDocumentId: 'doc-1',
      targetTaskId: 'task-1',
    });
  });

  it('maps a task source to the task morph leg', () => {
    expect(
      buildA2eLinkRecordInput({
        sourceObjectNameSingular: 'task',
        sourceRecordId: 'task-1',
        targetObjectNameSingular: 'document',
        targetRecordId: 'doc-1',
      }),
    ).toEqual({
      linkKey: 'task:task-1:document:doc-1',
      linkType: 'USER_LINK',
      sourceTaskId: 'task-1',
      targetDocumentId: 'doc-1',
    });
  });

  it('returns null for an object with no declared morph leg', () => {
    expect(
      buildA2eLinkRecordInput({
        sourceObjectNameSingular: 'company',
        sourceRecordId: 'company-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      }),
    ).toBeNull();

    expect(
      buildA2eLinkRecordInput({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'company',
        targetRecordId: 'company-1',
      }),
    ).toBeNull();
  });

  it('produces the same linkKey for a repeated pair, so the unique index rejects it', () => {
    const endpoints = {
      sourceObjectNameSingular: 'document',
      sourceRecordId: 'doc-1',
      targetObjectNameSingular: 'task',
      targetRecordId: 'task-1',
    };

    expect(buildA2eLinkRecordInput(endpoints)?.linkKey).toBe(
      buildA2eLinkRecordInput({ ...endpoints })?.linkKey,
    );
  });
});
