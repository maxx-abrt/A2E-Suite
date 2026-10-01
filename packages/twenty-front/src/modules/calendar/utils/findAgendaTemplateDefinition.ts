import {
  AGENDA_TEMPLATE_DEFINITIONS,
  type AgendaTemplateDefinition,
} from '@/calendar/constants/AgendaTemplateDefinitions';

// The finder lives outside `constants/` because that glob allows a single const
// declaration per file (twenty/max-consts-per-file); the definitions file keeps
// its data and this keeps the lookup.
export const findAgendaTemplateDefinition = (
  key: string,
): AgendaTemplateDefinition | undefined =>
  AGENDA_TEMPLATE_DEFINITIONS.find((definition) => definition.key === key);
