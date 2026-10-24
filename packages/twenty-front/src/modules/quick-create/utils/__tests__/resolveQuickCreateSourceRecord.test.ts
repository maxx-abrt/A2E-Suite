import { resolveQuickCreateSourceRecord } from '@/quick-create/utils/resolveQuickCreateSourceRecord';
import { ContextStorePageType } from 'twenty-shared/types';

describe('resolveQuickCreateSourceRecord', () => {
  it('links a creation to the full-page Bureau document', () => {
    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Standalone,
        objectNameSingular: undefined,
        selectedRecordIds: [],
        bureauDocumentId: 'bureau-page',
      }),
    ).toEqual({ objectNameSingular: 'document', recordId: 'bureau-page' });
  });

  it('prefers an explicitly opened record over the Bureau page behind it', () => {
    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Record,
        objectNameSingular: 'task',
        selectedRecordIds: ['task-in-panel'],
        bureauDocumentId: 'bureau-page',
      }),
    ).toEqual({ objectNameSingular: 'task', recordId: 'task-in-panel' });
  });
  it('returns the current record on a record page', () => {
    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Record,
        objectNameSingular: 'document',
        selectedRecordIds: ['doc-1'],
      }),
    ).toEqual({ objectNameSingular: 'document', recordId: 'doc-1' });
  });

  it('returns null outside a record page', () => {
    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Index,
        objectNameSingular: 'document',
        selectedRecordIds: ['doc-1'],
      }),
    ).toBeNull();

    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Standalone,
        objectNameSingular: 'document',
        selectedRecordIds: ['doc-1'],
      }),
    ).toBeNull();
  });

  it('returns null when the record page has no resolved record', () => {
    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Record,
        objectNameSingular: 'document',
        selectedRecordIds: [],
      }),
    ).toBeNull();

    expect(
      resolveQuickCreateSourceRecord({
        pageType: ContextStorePageType.Record,
        objectNameSingular: undefined,
        selectedRecordIds: ['doc-1'],
      }),
    ).toBeNull();
  });
});
