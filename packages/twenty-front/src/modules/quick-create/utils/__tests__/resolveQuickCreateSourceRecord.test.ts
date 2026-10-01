import { resolveQuickCreateSourceRecord } from '@/quick-create/utils/resolveQuickCreateSourceRecord';
import { ContextStorePageType } from 'twenty-shared/types';

describe('resolveQuickCreateSourceRecord', () => {
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
