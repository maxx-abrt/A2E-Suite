import { buildA2eLinkKey } from '@/a2e-links/utils/buildA2eLinkKey';

describe('buildA2eLinkKey', () => {
  it('is the documented source:target key', () => {
    expect(
      buildA2eLinkKey({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      }),
    ).toBe('document:doc-1:task:task-1');
  });

  it('is order-sensitive, so a reversed pair is a distinct key', () => {
    expect(
      buildA2eLinkKey({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      }),
    ).not.toBe(
      buildA2eLinkKey({
        sourceObjectNameSingular: 'task',
        sourceRecordId: 'task-1',
        targetObjectNameSingular: 'document',
        targetRecordId: 'doc-1',
      }),
    );
  });

  it('is stable for the same pair, which is what the unique linkKey enforces', () => {
    const endpoints = {
      sourceObjectNameSingular: 'document',
      sourceRecordId: 'doc-1',
      targetObjectNameSingular: 'task',
      targetRecordId: 'task-1',
    };

    expect(buildA2eLinkKey(endpoints)).toBe(buildA2eLinkKey({ ...endpoints }));
  });
});
