// Starter bundle contents for P1.6d. These are proposals shipped with the
// Projects app so a fresh install opens with immediately usable projects —
// mirrors A2E Documents' starter-templates.ts contract: pure code-data (never
// records from another workspace), idempotent seeding (repeat-safe by key),
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
  {
    name: 'Tableau de sprint',
    key: 'SPR',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Sprint de deux semaines : du backlog affiné à la revue et à la rétrospective.',
    tasks: [
      { title: 'Affiner le backlog du sprint', projectStatus: 'DONE' },
      { title: 'Sprint planning et engagement d’équipe', projectStatus: 'DONE' },
      { title: 'Développer les stories engagées', projectStatus: 'IN_PROGRESS' },
      { title: 'Revue de sprint avec les parties prenantes', projectStatus: 'TODO' },
      { title: 'Rétrospective et actions d’amélioration', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Début de sprint', dueInDays: -1 },
      { name: 'Fin de développement', dueInDays: 8 },
      { name: 'Revue et rétrospective', dueInDays: 14 },
    ],
  },
  {
    name: 'Calendrier de contenu',
    key: 'CNT',
    status: 'PLANNING',
    health: 'ON_TRACK',
    description:
      'Planification éditoriale : thématiques, production, programmation et bilan multicanale.',
    tasks: [
      { title: 'Définir les thématiques du trimestre', projectStatus: 'DONE' },
      { title: 'Construire le calendrier éditorial', projectStatus: 'IN_PROGRESS' },
      { title: 'Rédiger les contenus prioritaires', projectStatus: 'TODO' },
      { title: 'Programmer les publications', projectStatus: 'TODO' },
      { title: 'Analyser les performances et ajuster', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Ligne éditoriale validée', dueInDays: -5 },
      { name: 'Premier lot publié', dueInDays: 14 },
      { name: 'Bilan du trimestre', dueInDays: 45 },
    ],
  },
  {
    name: 'Pipeline de recrutement',
    key: 'REC',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Sourcing, entretiens et décision pour pourvoir un poste clé sans perdre de candidats.',
    tasks: [
      { title: 'Rédiger la fiche de poste', projectStatus: 'DONE' },
      { title: 'Diffuser l’annonce et sourcer', projectStatus: 'DONE' },
      { title: 'Mener les entretiens de présélection', projectStatus: 'IN_PROGRESS' },
      { title: 'Entretiens finaux et prise de références', projectStatus: 'TODO' },
      { title: 'Émettre l’offre et préparer l’arrivée', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Poste ouvert', dueInDays: -7 },
      { name: 'Shortlist d’entretiens', dueInDays: 10 },
      { name: 'Offre acceptée', dueInDays: 30 },
    ],
  },
  {
    name: 'Intégration client',
    key: 'ONB',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Parcours d’onboarding client : lancement, configuration, formation et suivi d’adoption.',
    tasks: [
      { title: 'Organiser la réunion de lancement', projectStatus: 'DONE' },
      { title: 'Collecter les accès et prérequis', projectStatus: 'IN_PROGRESS' },
      { title: 'Configurer l’espace du client', projectStatus: 'TODO' },
      { title: 'Former les utilisateurs clés', projectStatus: 'TODO' },
      { title: 'Point de suivi à 30 jours', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Kick-off réalisé', dueInDays: 0 },
      { name: 'Configuration livrée', dueInDays: 12 },
      { name: 'Adoption confirmée', dueInDays: 30 },
    ],
  },
  {
    name: 'Refonte du site web',
    key: 'WEB',
    status: 'PLANNING',
    health: 'ON_TRACK',
    description:
      'Refonte du site : audit, arborescence, design, développement et mise en ligne.',
    tasks: [
      { title: 'Auditer le site actuel et les analytics', projectStatus: 'DONE' },
      { title: 'Définir l’arborescence et les parcours', projectStatus: 'IN_PROGRESS' },
      { title: 'Valider les maquettes', projectStatus: 'TODO' },
      { title: 'Développer et intégrer les pages', projectStatus: 'TODO' },
      { title: 'Mettre en ligne et surveiller', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Audit terminé', dueInDays: -7 },
      { name: 'Maquettes validées', dueInDays: 14 },
      { name: 'Mise en ligne', dueInDays: 45 },
    ],
  },
  {
    name: 'Semestre étudiant',
    key: 'SEM',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Organisation d’un semestre : cours, travaux, révisions et examens.',
    tasks: [
      { title: 'Rassembler les syllabus et échéances', projectStatus: 'DONE' },
      { title: 'Planifier les révisions hebdomadaires', projectStatus: 'IN_PROGRESS' },
      { title: 'Rendre les travaux dirigés', projectStatus: 'TODO' },
      { title: 'Réviser les matières principales', projectStatus: 'TODO' },
      { title: 'Passer les examens finaux', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Planning semestriel prêt', dueInDays: 0 },
      { name: 'Partiels', dueInDays: 40 },
      { name: 'Examens finaux', dueInDays: 90 },
    ],
  },
  {
    name: 'Assemblée générale annuelle',
    key: 'AGA',
    status: 'PLANNING',
    health: 'ON_TRACK',
    description:
      'Préparation de l’AG : convocation, ordre du jour, rapport moral, élections et PV.',
    tasks: [
      { title: 'Fixer la date et réserver la salle', projectStatus: 'DONE' },
      { title: 'Préparer l’ordre du jour et la convocation', projectStatus: 'IN_PROGRESS' },
      { title: 'Rassembler le rapport moral et les comptes', projectStatus: 'TODO' },
      { title: 'Préparer les élections du bureau', projectStatus: 'TODO' },
      { title: 'Animer la séance et rédiger le PV', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Convocation envoyée', dueInDays: -15 },
      { name: 'Jour de l’AG', dueInDays: 21 },
      { name: 'PV diffusé', dueInDays: 28 },
    ],
  },
  {
    name: 'Dossier de subvention',
    key: 'SUB',
    status: 'PLANNING',
    health: 'ON_TRACK',
    description:
      'Montage d’un dossier de subvention : cadrage, budget, pièces et dépôt. Le volet financier (budget, justificatifs, suivi des versements) se prépare dans Bilan ; ce projet ne l’installe ni ne le requiert.',
    tasks: [
      { title: 'Analyser l’appel à projets et les critères', projectStatus: 'DONE' },
      { title: 'Cadrer le projet et les objectifs', projectStatus: 'IN_PROGRESS' },
      { title: 'Chiffrer le budget prévisionnel', projectStatus: 'TODO' },
      { title: 'Rassembler les pièces justificatives', projectStatus: 'TODO' },
      { title: 'Déposer le dossier et accuser réception', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Critères analysés', dueInDays: -10 },
      { name: 'Budget consolidé', dueInDays: 7 },
      { name: 'Dossier déposé', dueInDays: 30 },
    ],
  },
  {
    name: 'Suivi des bugs',
    key: 'BUG',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Triage et résolution des anomalies : signalement, reproduction, priorisation, correctifs et vérification.',
    tasks: [
      { title: 'Centraliser les signalements', projectStatus: 'DONE' },
      { title: 'Reproduire et qualifier les bugs', projectStatus: 'IN_PROGRESS' },
      { title: 'Prioriser selon l’impact utilisateur', projectStatus: 'TODO' },
      { title: 'Corriger les anomalies critiques', projectStatus: 'TODO' },
      { title: 'Vérifier les correctifs et clôturer', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Backlog trié', dueInDays: 0 },
      { name: 'Bugs bloquants corrigés', dueInDays: 14 },
      { name: 'Campagne de clôture', dueInDays: 30 },
    ],
  },
  {
    name: 'Objectifs personnels',
    key: 'OBJ',
    status: 'ACTIVE',
    health: 'ON_TRACK',
    description:
      'Objectifs et habitudes personnels : intention, rituels de suivi et bilan.',
    tasks: [
      { title: 'Définir les objectifs du trimestre', projectStatus: 'DONE' },
      { title: 'Choisir les habitudes à suivre', projectStatus: 'IN_PROGRESS' },
      { title: 'Mettre en place le suivi quotidien', projectStatus: 'TODO' },
      { title: 'Ajuster après quatre semaines', projectStatus: 'TODO' },
      { title: 'Faire le bilan du trimestre', projectStatus: 'TODO' },
    ],
    milestones: [
      { name: 'Objectifs fixés', dueInDays: 0 },
      { name: 'Premier bilan mensuel', dueInDays: 30 },
      { name: 'Bilan trimestriel', dueInDays: 90 },
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
