import { isNonEmptyString } from '@sniptt/guards';
import { ContextStorePageType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export type QuickCreateSourceRecord = {
  objectNameSingular: string;
  recordId: string;
};

export const resolveQuickCreateSourceRecord = ({
  pageType,
  objectNameSingular,
  selectedRecordIds,
  bureauDocumentId,
}: {
  pageType: ContextStorePageType | undefined;
  objectNameSingular: string | undefined;
  selectedRecordIds: string[];
  bureauDocumentId?: string;
}): QuickCreateSourceRecord | null => {
  if (pageType !== ContextStorePageType.Record) {
    return isNonEmptyString(bureauDocumentId)
      ? { objectNameSingular: 'document', recordId: bureauDocumentId }
      : null;
  }

  const recordId = selectedRecordIds[0];

  if (!isDefined(recordId) || !isNonEmptyString(recordId)) {
    return null;
  }

  if (!isDefined(objectNameSingular) || !isNonEmptyString(objectNameSingular)) {
    return null;
  }

  return { objectNameSingular, recordId };
};
