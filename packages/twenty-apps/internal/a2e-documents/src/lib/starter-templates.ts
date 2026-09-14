// Starter bundle contents for P1.6d. These are proposals shipped with the
// Documents app so a fresh install opens with immediately usable templates.
// Content is code-data here (server code versioned with the repo) — never a
// record from another workspace, per the template-ownership contract.

export type StarterDocumentTemplate = {
  title: string;
  markdown: string;
};

export const STARTER_DOCUMENT_TEMPLATES: StarterDocumentTemplate[] = [
  {
    title: 'Modèle — Notes de réunion',
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
    markdown:
      '# Entretien individuel\n\n## Agenda\n\n## Points de la dernière fois\n\n## Ce qui avance\n\n## Obstacles\n\n## Actions\n\n## Prochain rendez-vous\n',
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
