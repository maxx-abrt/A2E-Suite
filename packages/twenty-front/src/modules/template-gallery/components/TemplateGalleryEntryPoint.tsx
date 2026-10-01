import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { Button } from 'twenty-ui/input';
import { IconFileText } from 'twenty-ui/icon';

export type TemplateGalleryEntryPointProps = {
  // The apps whose presence gates the entry-point. A landing page or empty
  // state for an app passes its own universal identifier so the entry-point
  // disappears before the app is installed.
  requiredApplicationUniversalIdentifiers: string[];
  // Soft category preselect for the gallery (AC5). `null` opens unfiltered.
  category?: TemplateDescriptorCategory | null;
  label?: string;
};

// The embeddable "Use a template" entry-point other slices (M7f landings, M13c
// empty states) drop into their surfaces. It is install-gated: with none of its
// required apps present it renders nothing, so a host can embed it
// unconditionally. Opening always goes through the shared gallery seam, so
// there is exactly one host surface.
export const TemplateGalleryEntryPoint = ({
  requiredApplicationUniversalIdentifiers,
  category = null,
  label,
}: TemplateGalleryEntryPointProps) => {
  const { t } = useLingui();
  const applications = useAtomStateValue(applicationsSelector);
  const { openTemplateGallery } = useOpenTemplateGallery();

  const installedUniversalIdentifiers = new Set(
    applications.map((application) => application.universalIdentifier),
  );

  const isAvailable = requiredApplicationUniversalIdentifiers.some(
    (universalIdentifier) =>
      installedUniversalIdentifiers.has(universalIdentifier),
  );

  if (!isAvailable) {
    return null;
  }

  const entryPointLabel = label ?? t`Use a template`;

  return (
    <Button
      Icon={IconFileText}
      title={entryPointLabel}
      ariaLabel={entryPointLabel}
      variant="secondary"
      size="small"
      onClick={() => openTemplateGallery({ category })}
      dataTestId="template-gallery-entry-point"
    />
  );
};
