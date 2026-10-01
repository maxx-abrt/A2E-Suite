import { isNonEmptyString } from '@sniptt/guards';
import { ContextStorePageType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export type QuickCreateSourceRecord = {
  objectNameSingular: string;
  recordId: string;
};

// The current record a Cmd+K creation should pre-link to. Only a record page
// exposes one: the record page seeds the context store with a single selected
// record (`RecordShowContainerContextStoreTargetedRecordsEffect`), so a
// standalone/index page yields null and creation proceeds unlinked.
export const resolveQuickCreateSourceRecord = ({
  pageType,
  objectNameSingular,
  selectedRecordIds,
}: {
  pageType: ContextStorePageType | undefined;
  objectNameSingular: string | undefined;
  selectedRecordIds: string[];
}): QuickCreateSourceRecord | null => {
  if (pageType !== ContextStorePageType.Record) {
    return null;
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
