import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';
import { type TemplateGalleryDescriptorGroup } from '@/template-gallery/types/TemplateGalleryDescriptorGroup';

// Host-side descriptor groups. Agenda is a core calendar surface with no app
// and therefore no `list-template-descriptors` logic function, so its family is
// registered here as a static group. Syna is the host AI surface and ships its
// prompt/action recipes the same way. The gallery merges these groups with the
// per-app logic-function results and install-gates them identically (an empty
// `requiredApps` is always available).
//
// Every Agenda descriptor currently shares one source application, so the group
// filters them by that inline source identity — a second host surface with a
// different source would need its own entry here without changing the gallery.
// Syna's recipes keep their execution-only fields (`status`, `requiredToolName`,
// `prompt`, `deferral`) on the registry: only READY recipes are projected to the
// gallery, so a P7-gated recipe is never shown as applicable.
export const HOST_TEMPLATE_DESCRIPTOR_GROUPS: TemplateGalleryDescriptorGroup[] =
  [
    {
      applicationUniversalIdentifier: 'a2e-host-agenda',
      applicationName: 'Agenda',
      templates: AGENDA_TEMPLATE_DESCRIPTORS.filter(
        (descriptor) =>
          descriptor.sourceUniversalIdentifier === 'a2e-host-agenda',
      ).map(
        ({ sourceUniversalIdentifier: _source, sourceName: _name, ...rest }) =>
          rest,
      ),
    },
    {
      applicationUniversalIdentifier: 'a2e-host-syna',
      applicationName: 'Syna',
      templates: SYNA_RECIPE_DESCRIPTORS.filter(
        (descriptor) => descriptor.status === 'READY',
      ).map(
        ({
          sourceUniversalIdentifier: _source,
          sourceName: _name,
          status: _status,
          requiredToolName: _requiredToolName,
          prompt: _prompt,
          deferral: _deferral,
          ...descriptor
        }) => descriptor,
      ),
    },
  ];
