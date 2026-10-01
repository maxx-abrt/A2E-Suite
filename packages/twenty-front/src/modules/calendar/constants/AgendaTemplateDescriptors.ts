import { type TemplateDescriptor } from 'twenty-shared/application';

// M9c — the six Agenda template descriptors, shaped by the C1 contract (key,
// version, fr+en labels, category, preview, requiredApps, inputs). Agenda has
// no app, so the gallery gets them from this host-side group; they carry their
// source identity inline (the synthetic application the gallery attributes
// them to). Each preview count is the event count of the matching
// `AGENDA_TEMPLATE_DEFINITIONS` entry (a unit test keeps the two in step).
export const AGENDA_TEMPLATE_DESCRIPTORS: (TemplateDescriptor & {
  sourceUniversalIdentifier: string;
  sourceName: string;
})[] = [
  {
    key: 'agenda-blocage-temps-semaine',
    version: 1,
    labels: {
      fr: 'Blocage de temps hebdomadaire',
      en: 'Weekly time-block',
    },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Un bloc de travail profond par jour ouvré',
          en: 'One deep-work block per workday',
        },
        count: 5,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
  {
    key: 'agenda-rituels-equipe',
    version: 1,
    labels: { fr: 'Rituels d’équipe', en: 'Team rituals' },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Mêlée quotidienne et rétrospective hebdomadaire récurrentes',
          en: 'Recurring daily stand-up and weekly retrospective',
        },
        count: 2,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
  {
    key: 'agenda-calendrier-editorial',
    version: 1,
    labels: { fr: 'Calendrier éditorial', en: 'Editorial calendar' },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Rédaction, relecture, publication et relance planifiées',
          en: 'Scheduled writing, review, publishing and follow-up',
        },
        count: 4,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
  {
    key: 'agenda-revision-examens',
    version: 1,
    labels: { fr: 'Révisions d’examens', en: 'Exam revision schedule' },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Six sessions de révision sur deux semaines',
          en: 'Six revision sessions across two weeks',
        },
        count: 6,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
  {
    key: 'agenda-deroule-evenement',
    version: 1,
    labels: { fr: 'Déroulé d’événement', en: 'Event run-sheet' },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Le déroulé d’une journée d’événement, de l’accueil à la clôture',
          en: 'One event day, from welcome to closing',
        },
        count: 6,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
  {
    key: 'agenda-planning-equipes',
    version: 1,
    labels: { fr: 'Planning d’équipes', en: 'Shift roster' },
    category: 'Agenda',
    preview: [
      {
        object: 'calendarEvent',
        summary: {
          fr: 'Postes matin et après-midi pour chaque jour ouvré',
          en: 'Morning and afternoon shifts for every workday',
        },
        count: 10,
      },
    ],
    requiredApps: [],
    inputs: [],
    sourceUniversalIdentifier: 'a2e-host-agenda',
    sourceName: 'Agenda',
  },
];
