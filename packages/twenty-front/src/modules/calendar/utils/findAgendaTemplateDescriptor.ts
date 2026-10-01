import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';
import { type TemplateDescriptor } from 'twenty-shared/application';

// The finder lives outside `constants/` because that glob allows a single const
// declaration per file (twenty/max-consts-per-file); the descriptors file keeps
// its data and this keeps the lookup.
export const findAgendaTemplateDescriptor = (
  key: string,
): TemplateDescriptor | undefined =>
  AGENDA_TEMPLATE_DESCRIPTORS.find((descriptor) => descriptor.key === key);
