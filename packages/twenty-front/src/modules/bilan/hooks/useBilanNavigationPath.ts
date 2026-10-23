import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { pageLayoutsWithRelationsSelector } from '@/page-layout/states/pageLayoutsWithRelationsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

export const useBilanNavigationPath = (): string | null => {
  const pageLayoutsWithRelations = useAtomStateValue(
    pageLayoutsWithRelationsSelector,
  );
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const dashboard = pageLayoutsWithRelations.find(
    (pageLayout) =>
      pageLayout.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.dashboard,
  );
  if (dashboard)
    return getAppPath(AppPath.PageLayoutPage, { pageLayoutId: dashboard.id });

  // Older app versions may expose invoices before the dashboard is installed.
  const invoice = readableObjectMetadataItems.find(
    (item) =>
      item.universalIdentifier === BILAN_METADATA_UNIVERSAL_IDENTIFIERS.invoice,
  );
  return invoice
    ? getAppPath(AppPath.RecordIndexPage, {
        objectNamePlural: invoice.namePlural,
      })
    : null;
};
