import { type CalendarRecurrenceFrequency } from '@/calendar/types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';

// M9c — the Agenda template family's structure. Agenda is a host calendar
// surface with no app, so these skeletons live beside the host calendar
// constants: each definition names the calendarEvent rows an apply writes, no
// real data, only the shape a user then fills in.
//
// Placement is relative to the apply's anchor day (today): `dayOfWeek` pins an
// event to the next such weekday so a weekly ritual lands on the right day,
// `dayOffset` is a plain day count for one-off schedules.

export type AgendaTemplateRecurrenceSpec = {
  frequency: CalendarRecurrenceFrequency;
  weekdays?: CalendarRecurrenceWeekday[];
};

export type AgendaTemplateEventSpec = {
  title: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  dayOfWeek?: CalendarRecurrenceWeekday;
  dayOffset?: number;
  isFullDay?: boolean;
  recurrence?: AgendaTemplateRecurrenceSpec;
  reminderMinutes?: number | null;
};

export type AgendaTemplateKey =
  | 'agenda-blocage-temps-semaine'
  | 'agenda-rituels-equipe'
  | 'agenda-calendrier-editorial'
  | 'agenda-revision-examens'
  | 'agenda-deroule-evenement'
  | 'agenda-planning-equipes';

export type AgendaTemplateDefinition = {
  key: AgendaTemplateKey;
  events: AgendaTemplateEventSpec[];
};

// The family's skeletons. Times are wall-clock and the apply places each event
// on the coming workday, so nothing here is a fake dated record.
export const AGENDA_TEMPLATE_DEFINITIONS: AgendaTemplateDefinition[] = [
  {
    key: 'agenda-blocage-temps-semaine',
    events: (['MO', 'TU', 'WE', 'TH', 'FR'] as CalendarRecurrenceWeekday[]).map(
      (dayOfWeek) => ({
        title: 'Travail profond',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 180,
        dayOfWeek,
      }),
    ),
  },
  {
    key: 'agenda-rituels-equipe',
    events: [
      {
        title: 'Mêlée quotidienne',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 15,
        dayOffset: 0,
        recurrence: { frequency: 'daily' },
      },
      {
        title: 'Rétrospective d’équipe',
        startHour: 16,
        startMinute: 0,
        durationMinutes: 60,
        dayOfWeek: 'FR',
        recurrence: { frequency: 'weekly', weekdays: ['FR'] },
      },
    ],
  },
  {
    key: 'agenda-calendrier-editorial',
    events: [
      {
        title: 'Rédaction — article',
        startHour: 10,
        startMinute: 0,
        durationMinutes: 60,
        dayOffset: 0,
      },
      {
        title: 'Relecture — article',
        startHour: 10,
        startMinute: 0,
        durationMinutes: 60,
        dayOffset: 3,
      },
      {
        title: 'Publication — newsletter',
        startHour: 10,
        startMinute: 0,
        durationMinutes: 60,
        dayOffset: 7,
      },
      {
        title: 'Relance — réseaux sociaux',
        startHour: 10,
        startMinute: 0,
        durationMinutes: 60,
        dayOffset: 10,
      },
    ],
  },
  {
    key: 'agenda-revision-examens',
    events: [
      {
        title: 'Révision — matière A',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 0,
      },
      {
        title: 'Révision — matière B',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 2,
      },
      {
        title: 'Révision — matière C',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 4,
      },
      {
        title: 'Révision — matière A',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 7,
      },
      {
        title: 'Révision — matière B',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 9,
      },
      {
        title: 'Révision — matière C',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 11,
      },
    ],
  },
  {
    key: 'agenda-deroule-evenement',
    events: [
      {
        title: 'Accueil',
        startHour: 8,
        startMinute: 30,
        durationMinutes: 30,
        dayOffset: 0,
      },
      {
        title: 'Ouverture',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 30,
        dayOffset: 0,
      },
      {
        title: 'Table ronde',
        startHour: 10,
        startMinute: 0,
        durationMinutes: 90,
        dayOffset: 0,
      },
      {
        title: 'Pause déjeuner',
        startHour: 12,
        startMinute: 0,
        durationMinutes: 60,
        dayOffset: 0,
      },
      {
        title: 'Ateliers',
        startHour: 14,
        startMinute: 0,
        durationMinutes: 120,
        dayOffset: 0,
      },
      {
        title: 'Clôture',
        startHour: 17,
        startMinute: 0,
        durationMinutes: 30,
        dayOffset: 0,
      },
    ],
  },
  {
    key: 'agenda-planning-equipes',
    events: (
      ['MO', 'TU', 'WE', 'TH', 'FR'] as CalendarRecurrenceWeekday[]
    ).flatMap((dayOfWeek) => [
      {
        title: 'Poste matin',
        startHour: 6,
        startMinute: 0,
        durationMinutes: 480,
        dayOfWeek,
      },
      {
        title: 'Poste après-midi',
        startHour: 14,
        startMinute: 0,
        durationMinutes: 480,
        dayOfWeek,
      },
    ]),
  },
];
