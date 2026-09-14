// Starter bundle contents for P1.6d. These are proposals shipped with the
// Projects app so a fresh install opens with immediately usable projects —
// mirrors A2E Documents' starter-templates.ts contract: pure code-data (never
// records from another workspace), idempotent seeding (repeat-safe by name),
// and content that only references objects this app itself owns.

export type StarterTaskTemplate = {
  title: string;
  projectStatus: 'TODO' | 'IN_PROGRESS' | 'DONE';
};

export type StarterMilestoneTemplate = {
  name: string;
  // Days from install day — the seeder resolves them to real dates so the
  // calendar view shows a live plan on first open, not a dead template.
  dueInDays: number;
};

export type StarterProjectTemplate = {
  name: string;
  key: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  health: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  description: string;
  tasks: StarterTaskTemplate[];
  milestones: StarterMilestoneTemplate[];
};

export const STARTER_PROJECT_TEMPLATES: StarterProjectTemplate[] = [
  {
    name: 'Livraison de projet',
    key: 'LIV',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Cadence de livraison standard : cadrage, construction, recette, mise en production.',
    tasks: [
      { title: 'Cadrer le périmètre et les objectifs', projectStatus: 'DONE' },
      { title: 'Rédiger le brief projet', projectStatus: 'DONE' },
      { title: 'Construire les livrables', projectStatus: 'IN_PROGRESS' },
      { title: 'Recette interne', projectStatus: 'TODO' },
      { title: 'Mise en production', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Cadrage validé', dueInDays: -7 },
      { name: 'Livrables prêts pour recette', dueInDays: 14 },
      { name: 'Mise en production', dueInDays: 30 },
    ],
  },
  {
    name: 'Rétroplanning d’événement',
    key: 'EVT',
    status: 'PLANNING',
    health: 'ON_TRACK',
    description:
      'Compte à rebours d’un événement : logistique, communication et coordination jour J.',
    tasks: [
      { title: 'Réserver le lieu', projectStatus: 'DONE' },
      { title: 'Envoyer les invitations', projectStatus: 'IN_PROGRESS' },
      { title: 'Préparer les supports de présentation', projectStatus: 'TODO' },
      { title: 'Coordonner les intervenants', projectStatus: 'TODO' },
      { title: 'Brief de l’équipe le jour J', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Lieu confirmé', dueInDays: -3 },
      { name: 'Programme finalisé', dueInDays: 10 },
      { name: 'Jour J', dueInDays: 21 },
    ],
  },
];

// The seeder resolves dueInDays against install day; keeping this pure lets
// the tests pin the mapping without mocking the clock.
export const resolveMilestoneDueAt = (
  dueInDays: number,
  now: Date,
): string => {
  const dueAt = new Date(now);
  dueAt.setUTCDate(dueAt.getUTCDate() + dueInDays);

  return dueAt.toISOString();
};

export const findMissingStarterProjects = (
  existingProjectKeys: string[],
): StarterProjectTemplate[] => {
  const knownKeys = new Set(existingProjectKeys);

  return STARTER_PROJECT_TEMPLATES.filter(
    (starterProject) => !knownKeys.has(starterProject.key),
  );
};
