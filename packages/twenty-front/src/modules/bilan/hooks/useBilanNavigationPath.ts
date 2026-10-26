import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useBilanPageLayouts } from '@/bilan/hooks/useBilanPageLayouts';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

export const useBilanNavigationPath = (): string | null => {
  const pageLayouts = useBilanPageLayouts();
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const dashboard = pageLayouts.find(
    (pageLayout) =>
      pageLayout.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.dashboard,
  );
  if (isDefined(dashboard?.id))
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
