import { BUREAU_LANDING_TEMPLATE_LINKS } from '@/bureau/constants/BureauLandingTemplates';
import { msg } from '@lingui/core/macro';

export const BUREAU_STARTER_PROFILES = {
  individual: {
    label: msg`Individual`,
    description: msg`Plan your day, keep your ideas and review what matters.`,
    templates: [
      {
        descriptorKey: 'note-quotidienne',
        label: msg`Daily note`,
        projectTemplateKey: 'OBJ',
        projectLabel: msg`Personal goals`,
      },
      { descriptorKey: 'journal', label: msg`Journal` },
      { descriptorKey: 'revue-hebdomadaire', label: msg`Weekly review` },
    ],
  },
  student: {
    label: msg`Student`,
    description: msg`Organize your courses, reading and semester work.`,
    templates: [
      { descriptorKey: 'notes-de-cours-cornell', label: msg`Course notes` },
      {
        descriptorKey: 'plan-de-these',
        label: msg`Thesis planner`,
        projectTemplateKey: 'SEM',
        projectLabel: msg`Semester planner`,
      },
      { descriptorKey: 'liste-de-lecture', label: msg`Reading list` },
    ],
  },
  team: {
    label: msg`Small team`,
    description: msg`Turn shared notes and project decisions into clear work.`,
    templates: BUREAU_LANDING_TEMPLATE_LINKS,
  },
  nonprofit: {
    label: msg`Non-profit`,
    description: msg`Coordinate your association, meetings and funding work.`,
    templates: [
      {
        descriptorKey: 'notes-de-reunion',
        label: msg`Meeting notes`,
        projectTemplateKey: 'AGA',
        projectLabel: msg`Annual general meeting`,
      },
      {
        descriptorKey: 'brief-de-projet',
        label: msg`Project brief`,
        projectTemplateKey: 'SUB',
        projectLabel: msg`Grant application`,
      },
      { descriptorKey: 'journal-de-decisions-adr', label: msg`Decision log` },
    ],
  },
  business: {
    label: msg`Small business`,
    description: msg`Prepare client work, capture decisions and follow delivery.`,
    templates: [
      {
        descriptorKey: 'brief-de-projet',
        label: msg`Project brief`,
        projectTemplateKey: 'ONB',
        projectLabel: msg`Client onboarding`,
      },
      { descriptorKey: 'notes-de-reunion', label: msg`Meeting notes` },
      { descriptorKey: 'revue-hebdomadaire', label: msg`Weekly review` },
    ],
  },
};
