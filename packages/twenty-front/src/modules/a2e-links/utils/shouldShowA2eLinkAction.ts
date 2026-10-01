import { isLinkableObjectNameSingular } from '@/a2e-links/utils/buildA2eLinkRecordInput';

// The "Link…" entry is shown only when a2e-links is installed AND the current
// record's object has a declared morph leg; otherwise the action would have no
// junction to write to. Pure so the hide-when-uninstalled path is unit-testable
// without mounting the dropdown.
export const shouldShowA2eLinkAction = ({
  isA2eLinksApplicationInstalled,
  sourceObjectNameSingular,
}: {
  isA2eLinksApplicationInstalled: boolean;
  sourceObjectNameSingular: string;
}): boolean =>
  isA2eLinksApplicationInstalled &&
  isLinkableObjectNameSingular(sourceObjectNameSingular);
