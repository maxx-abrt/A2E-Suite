// Corrélation des recettes inter-apps (US-107, contrat C5).
//
// Chaque recette dérive une clé déterministe à partir de sa propre identité
// (`<recipeKey>@v<version>`), de l'espace de travail, de l'objet source et de
// l'identifiant de l'enregistrement source. Rejouer le déclencheur — retry,
// relivraison, retraitement d'un run — retombe donc sur la même clé, ce que
// l'étape écrit comme provenance sur sa ligne cible et relit avant de créer.
//
// La clé reste sérialisable et sans horloge : c'est ce qui rend le plan d'une
// recette reproductible, et donc prévisualisable avant activation.

export type RecipeCorrelationSource = {
  recipeKey: string;
  version: number;
  workspaceId?: string | null;
  sourceObject: string;
  sourceRecordId: string;
};

export const deriveRecipeCorrelationKey = (
  source: RecipeCorrelationSource,
): string =>
  `${source.recipeKey}@v${source.version}:${
    source.workspaceId ?? 'workspace'
  }:${source.sourceObject}:${source.sourceRecordId}`;
