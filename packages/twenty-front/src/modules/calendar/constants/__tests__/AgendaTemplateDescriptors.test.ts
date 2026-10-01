import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';
import { findAgendaTemplateDefinition } from '@/calendar/utils/findAgendaTemplateDefinition';
import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

const AGENDA_TEMPLATE_KEYS = [
  'agenda-blocage-temps-semaine',
  'agenda-rituels-equipe',
  'agenda-calendrier-editorial',
  'agenda-revision-examens',
  'agenda-deroule-evenement',
  'agenda-planning-equipes',
];

describe('Agenda template descriptors', () => {
  it('validates against the shared C1 contract', () => {
    expect(validateTemplateDescriptors(AGENDA_TEMPLATE_DESCRIPTORS)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('exposes the six PLAN M9c family templates under the Agenda category', () => {
    expect(
      AGENDA_TEMPLATE_DESCRIPTORS.map((descriptor) => descriptor.key),
    ).toEqual(AGENDA_TEMPLATE_KEYS);

    for (const descriptor of AGENDA_TEMPLATE_DESCRIPTORS) {
      expect(isTemplateDescriptor(descriptor)).toBe(true);
      expect(descriptor.category).toBe('Agenda');
      expect(descriptor.requiredApps).toEqual([]);
      expect(descriptor.preview).toHaveLength(1);
      expect(descriptor.preview[0].object).toBe('calendarEvent');
    }
  });

  it('declares the exact event count each apply writes', () => {
    for (const descriptor of AGENDA_TEMPLATE_DESCRIPTORS) {
      const definition = findAgendaTemplateDefinition(descriptor.key);

      expect(descriptor.preview[0].count).toBe(definition?.events.length);
      expect(descriptor.preview[0].count).toBeGreaterThan(0);
    }
  });

  it('attributes the family to the host Agenda source', () => {
    for (const descriptor of AGENDA_TEMPLATE_DESCRIPTORS) {
      expect(descriptor.sourceUniversalIdentifier).toBe('a2e-host-agenda');
      expect(descriptor.sourceName).toBe('Agenda');
    }
  });
});
