import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import {
  IconArchive,
  IconBriefcase,
  IconCalendarEvent,
  IconCoins,
  IconFileText,
  IconSettingsAutomation,
  type IconComponent,
} from 'twenty-ui/icon';

export type TemplateGalleryCategoryConfig = {
  label: MessageDescriptor;
  Icon: IconComponent;
};

// Ordered display grouping for the gallery; the key set mirrors the closed
// TemplateDescriptorCategory union so a descriptor can always be grouped.
// Icons follow the icon dictionary's "no concept matches → choose an existing
// twenty-ui/icon" rule (there is no Template concept listed).
export const TEMPLATE_GALLERY_CATEGORY_CONFIG: Record<
  TemplateDescriptorCategory,
  TemplateGalleryCategoryConfig
> = {
  Pages: { label: msg`Pages`, Icon: IconFileText },
  Projets: { label: msg`Projects`, Icon: IconBriefcase },
  Bilan: { label: msg`Bilan`, Icon: IconCoins },
  Archive: { label: msg`Archive`, Icon: IconArchive },
  Agenda: { label: msg`Agenda`, Icon: IconCalendarEvent },
  Automatisations: { label: msg`Automations`, Icon: IconSettingsAutomation },
};
