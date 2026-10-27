// Starter bundle contents for P1.6d. These are proposals shipped with the
// Documents app so a fresh install opens with immediately usable templates.
// Content is code-data here (server code versioned with the repo) — never a
// record from another workspace, per the template-ownership contract.

export type StarterDocumentTemplate = {
  title: string;
  markdown: string;
  english?: { title: string; markdown: string };
};

export const STARTER_DOCUMENT_TEMPLATES: StarterDocumentTemplate[] = [
  {
    title: 'Modèle — Notes de réunion',
    english: {
      title: 'Meeting notes',
      markdown:
        '# Meeting notes\n\n## Participants\n\n## Agenda\n\n## Decisions\n\n## Actions\n',
    },
    markdown:
      '# Notes de réunion\n\n## Participants\n\n## Ordre du jour\n\n## Décisions\n\n## Actions\n',
  },
  {
    title: 'Modèle — Brief de projet',
    markdown:
      '# Brief de projet\n\n## Contexte\n\n## Objectifs\n\n## Livrables\n\n## Équipe\n\n## Échéances\n',
  },
  {
    title: 'Modèle — Spécifications produit (PRD)',
    markdown:
      '# Spécifications produit (PRD)\n\n## Problème\n\n## Utilisateurs cibles\n\n## Périmètre\n\n## Hors périmètre\n\n## Critères d’acceptation\n\n## Jalons\n',
  },
  {
    title: 'Modèle — Entretien individuel',
    english: {
      title: 'One-on-one',
      markdown:
        '# One-on-one\n\n## Agenda\n\n## Follow-up from last time\n\n## Progress\n\n## Obstacles\n\n## Actions\n\n## Next meeting\n',
    },
    markdown:
      '# Entretien individuel\n\n## Agenda\n\n## Points de la dernière fois\n\n## Ce qui avance\n\n## Obstacles\n\n## Actions\n\n## Prochain rendez-vous\n',
  },
  {
    title: 'Modèle — Journal',
    english: {
      title: 'Journal',
      markdown:
        '# Journal\n\n## Date\n\n## Mood\n\n## Highlights\n\n## What I learned\n\n## Gratitude\n\n## Tomorrow\n',
    },
    markdown:
      '# Journal\n\n## Date\n\n## Humeur\n\n## Faits marquants\n\n## Ce que j’ai appris\n\n## Gratitude\n\n## Demain\n',
  },
  {
    title: 'Modèle — Revue hebdomadaire',
    english: {
      title: 'Weekly review',
      markdown:
        '# Weekly review\n\n## Progress\n\n## Blockers\n\n## Lessons\n\n## Priorities for next week\n',
    },
    markdown:
      '# Revue hebdomadaire\n\n## Ce qui a avancé\n\n## Ce qui a bloqué\n\n## Leçons\n\n## Priorités de la semaine prochaine\n',
  },
  {
    title: 'Modèle — Note quotidienne',
    english: {
      title: 'Daily note',
      markdown:
        '# Daily note\n\n## Date\n\n## Today’s priorities\n\n## Notes\n\n## Ideas\n\n## Tomorrow\n',
    },
    markdown:
      '# Note quotidienne\n\n## Date\n\n## Priorités du jour\n\n## Notes\n\n## Idées\n\n## Demain\n',
  },
  {
    title: 'Modèle — OKR',
    markdown:
      '# OKR\n\n## Période\n\n## Objectif 1\n\n### Résultat clé 1\n\n### Résultat clé 2\n\n## Objectif 2\n\n### Résultat clé 1\n\n## Suivi\n',
  },
  {
    title: 'Modèle — Accueil du wiki d’équipe',
    markdown:
      '# Wiki d’équipe\n\n## Qui sommes-nous\n\n## Organisation\n\n## Rituels d’équipe\n\n## Outils\n\n## Pages clés\n',
  },
  {
    title: 'Modèle — Guide d’intégration',
    markdown:
      '# Guide d’intégration\n\n## Bienvenue\n\n## Premier jour\n\n## Première semaine\n\n## Contacts clés\n\n## Ressources\n\n## Questions fréquentes\n',
  },
  {
    title: 'Modèle — Ordre du jour récurrent',
    english: {
      title: 'Recurring meeting agenda',
      markdown:
        '# Recurring meeting agenda\n\n## Participants\n\n## Recurring topics\n\n## Action follow-up\n\n## New topics\n\n## Next meeting\n',
    },
    markdown:
      '# Ordre du jour récurrent\n\n## Participants\n\n## Points récurrents\n\n## Suivi des actions\n\n## Nouveaux sujets\n\n## Prochaine réunion\n',
  },
  {
    title: 'Modèle — Journal de décisions (ADR)',
    markdown:
      '# Journal de décisions (ADR)\n\n## Contexte\n\n## Décision\n\n## Statut\n\n## Conséquences\n\n## Alternatives envisagées\n',
  },
  {
    title: 'Modèle — Rétrospective',
    markdown:
      '# Rétrospective\n\n## Ce qui a bien marché\n\n## Ce qui peut être amélioré\n\n## Actions\n\n## Votes\n',
  },
  {
    title: 'Modèle — Brainstorming',
    markdown:
      '# Brainstorming\n\n## Question\n\n## Idées\n\n## Regroupements\n\n## Sélection\n\n## Prochaines étapes\n',
  },
  {
    title: 'Modèle — Liste de lecture',
    english: {
      title: 'Reading list',
      markdown:
        '# Reading list\n\n## To read\n\n## In progress\n\n## Finished\n\n## Notes\n',
    },
    markdown:
      '# Liste de lecture\n\n## À lire\n\n## En cours\n\n## Terminé\n\n## Notes\n',
  },
  {
    title: 'Modèle — Notes de cours (Cornell)',
    english: {
      title: 'Course notes (Cornell)',
      markdown:
        '# Course notes (Cornell)\n\n## Cues and questions\n\n## Notes\n\n## Summary\n',
    },
    markdown:
      '# Notes de cours (Cornell)\n\n## Indices et questions\n\n## Notes\n\n## Résumé\n',
  },
  {
    title: 'Modèle — Plan de thèse',
    english: {
      title: 'Thesis planner',
      markdown:
        '# Thesis planner\n\n## Topic\n\n## Research question\n\n## Hypotheses\n\n## Methodology\n\n## Chapters\n\n## Deadlines\n\n## Bibliography\n',
    },
    markdown:
      '# Plan de thèse\n\n## Sujet\n\n## Question de recherche\n\n## Hypothèses\n\n## Méthodologie\n\n## Chapitres\n\n## Échéances\n\n## Bibliographie\n',
  },
  {
    title: 'Modèle — Recettes de cuisine',
    markdown:
      '# Recettes de cuisine\n\n## Ingrédients\n\n## Préparation\n\n## Temps de cuisson\n\n## Astuces\n',
  },
  {
    title: 'Modèle — Plan de voyage',
    markdown:
      '# Plan de voyage\n\n## Destination\n\n## Dates\n\n## Itinéraire\n\n## Réservations\n\n## Bagages\n\n## Budget\n',
  },
  {
    title: 'Modèle — CRM personnel',
    markdown:
      '# CRM personnel\n\n## Fiche contact\n\n## Dernier échange\n\n## Sujets en cours\n\n## Prochaine relance\n',
  },
];

export const findMissingStarterTemplates = (
  existingTemplateTitles: string[],
): StarterDocumentTemplate[] => {
  const knownTitles = new Set(existingTemplateTitles);

  return STARTER_DOCUMENT_TEMPLATES.filter(
    (starterTemplate) => !knownTitles.has(starterTemplate.title),
  );
};
