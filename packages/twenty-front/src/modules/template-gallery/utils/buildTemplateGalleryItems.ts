import { type TemplateGalleryDescriptorGroup } from '@/template-gallery/types/TemplateGalleryDescriptorGroup';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';

// Projects each app's returned descriptors onto the gallery's view model.
// Install-gating happens here: a descriptor is only `available` when every
// app it names in `requiredApps` is installed in this workspace — an empty
// `requiredApps` (an app owning its own object) is always available. A
// descriptor whose required app is missing is still listed so the surface can
// render a safe state rather than silently hiding the capability.
export const buildTemplateGalleryItems = ({
  descriptorGroups,
  installedApplicationUniversalIdentifiers,
}: {
  descriptorGroups: TemplateGalleryDescriptorGroup[];
  installedApplicationUniversalIdentifiers: string[];
}): TemplateGalleryItem[] => {
  const installedApplications = new Set(
    installedApplicationUniversalIdentifiers,
  );

  return descriptorGroups.flatMap((group) =>
    group.templates.map((descriptor) => ({
      descriptor,
      sourceApplication: {
        universalIdentifier: group.applicationUniversalIdentifier,
        name: group.applicationName,
      },
      available: descriptor.requiredApps.every((requiredApplication) =>
        installedApplications.has(requiredApplication),
      ),
    })),
  );
};
