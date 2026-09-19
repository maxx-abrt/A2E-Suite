// Recette « affaire gagnée » (P9.3).
//
// La partie pure de la recette : à partir d'une transition d'opportunité vers
// l'étape gagnée, elle dérive la clé de corrélation/idempotence du contrat
// inter-apps C5 puis le plan d'écritures (projet + canal lié) que la recette
// appliquera. Le plan est calculable sans moteur ni Core API : c'est ce qui
// permet de prévisualiser les écritures avant d'activer la recette.
//
// Aucune seconde file d'événements n'existe ici : la recette emprunte le
// vocabulaire du moteur de workflow natif (déclencheur DATABASE_EVENT + étapes
// LOGIC_FUNCTION) et ne fait que calculer ce que ces étapes écriront.

export const DEAL_WON_RECIPE_KEY = 'deal-won';
export const DEAL_WON_RECIPE_VERSION = 1;

// Étape terminale de l'opportunité dans le CRM standard : « CUSTOMER » est
// l'étape gagnée de Twenty (il n'existe pas de libellé « WON »). La recette la
// rend paramétrable pour un pipeline personnalisé, sans la coder en dur.
export const DEAL_WON_STAGE = 'CUSTOMER';

export const DEAL_WON_CHANNEL_KIND = 'PROJECT';
export const DEAL_WON_CHANNEL_VISIBILITY = 'PUBLIC';

export const DEAL_WON_FALLBACK_PROJECT_NAME = 'Affaire gagnée';
export const DEAL_WON_FALLBACK_PROJECT_KEY = 'PROJ';

export type DealWonChannelSkipReason = 'CHAT_NOT_INSTALLED';

export type DealWonOpportunitySnapshot = {
  id: string;
  name?: string | null;
  stage?: string | null;
  companyId?: string | null;
};

export type DealWonRecipeInput = {
  opportunity: DealWonOpportunitySnapshot;
  workspaceId?: string | null;
  isChatInstalled: boolean;
  wonStage?: string;
};

export type DealWonChannelSkip = {
  kind: 'CREATE_CHANNEL';
  reason: DealWonChannelSkipReason;
};

export type DealWonProjectWrite = {
  kind: 'CREATE_PROJECT';
  correlationKey: string;
  writes: {
    name: string;
    key: string;
    recipeCorrelationKey: string;
    companyId?: string;
  };
};

export type DealWonChannelWrite = {
  kind: 'CREATE_CHANNEL';
  correlationKey: string;
  writes: {
    name: string;
    kind: typeof DEAL_WON_CHANNEL_KIND;
    visibility: typeof DEAL_WON_CHANNEL_VISIBILITY;
    topic: string;
    projectIdSource: 'CREATED_PROJECT';
  };
};

export type DealWonRecipePlan = {
  correlationKey: string;
  steps: (DealWonProjectWrite | DealWonChannelWrite)[];
  skipped: DealWonChannelSkip[];
};

// Contrat d'événement inter-apps C5 : identifiant et type/version, espace de
// travail, enregistrement source, acteur et clé de corrélation. On le garde
// minimal et sérialisable : c'est le format que les étapes se transmettent.
export type DealWonEventEnvelope = {
  eventId: string | null;
  eventType: 'opportunity.updated';
  eventVersion: typeof DEAL_WON_RECIPE_VERSION;
  workspaceId: string | null;
  sourceObject: 'opportunity';
  sourceRecordId: string;
  actorId: string | null;
  correlationKey: string;
};

const normalizeKeyPart = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const isDealWonStage = (
  stage: string | null | undefined,
  wonStage: string = DEAL_WON_STAGE,
): boolean => typeof stage === 'string' && stage === wonStage;

// La clé est déterministe pour un même enregistrement source et une même
// version de recette : rejouer le déclencheur (retry, relivraison) retombe sur
// la même clé et la recette retrouve le projet qu'elle a déjà créé au lieu
// d'en créer un second. La clé de canal en dérive, pour rester alignée.
export const deriveDealWonCorrelationKey = (input: {
  opportunityId: string;
  workspaceId?: string | null;
}): string =>
  `${DEAL_WON_RECIPE_KEY}@v${DEAL_WON_RECIPE_VERSION}:${
    input.workspaceId ?? 'workspace'
  }:opportunity:${input.opportunityId}`;

export const deriveDealWonChannelCorrelationKey = (
  projectCorrelationKey: string,
): string => `${projectCorrelationKey}:channel`;

// Un préfixe court et neutre pour les identifiants de tâches (le champ `key` du
// projet). Déterministe à partir du nom : même affaire, même préfixe.
export const deriveDealWonProjectKey = (
  opportunityName: string | null | undefined,
): string => {
  const normalized = normalizeKeyPart(opportunityName ?? '').slice(0, 4);

  return normalized.length > 0 ? normalized : DEAL_WON_FALLBACK_PROJECT_KEY;
};

export const deriveDealWonProjectName = (
  opportunityName: string | null | undefined,
): string => {
  const trimmed = (opportunityName ?? '').trim();

  return trimmed.length > 0 ? trimmed : DEAL_WON_FALLBACK_PROJECT_NAME;
};

export const deriveDealWonChannelName = (projectName: string): string =>
  `Canal – ${projectName}`;

export const buildDealWonEventEnvelope = (
  opportunity: DealWonOpportunitySnapshot,
  metadata: { workspaceId?: string | null; actorId?: string | null } = {},
): DealWonEventEnvelope => {
  const workspaceId = metadata.workspaceId ?? null;

  return {
    eventId: null,
    eventType: 'opportunity.updated',
    eventVersion: DEAL_WON_RECIPE_VERSION,
    workspaceId,
    sourceObject: 'opportunity',
    sourceRecordId: opportunity.id,
    actorId: metadata.actorId ?? null,
    correlationKey: deriveDealWonCorrelationKey({
      opportunityId: opportunity.id,
      workspaceId,
    }),
  };
};

// Le plan de la recette. Quand A2E Chat est absent, l'étape de création du
// canal n'est pas planifiée et la raison est explicite — jamais une étape
// cassée, jamais un échec silencieux (règle de dégradation C5).
export const buildDealWonRecipePlan = (
  input: DealWonRecipeInput,
): DealWonRecipePlan => {
  const correlationKey = deriveDealWonCorrelationKey({
    opportunityId: input.opportunity.id,
    workspaceId: input.workspaceId,
  });
  const projectName = deriveDealWonProjectName(input.opportunity.name);
  const project: DealWonProjectWrite = {
    kind: 'CREATE_PROJECT',
    correlationKey,
    writes: {
      name: projectName,
      key: deriveDealWonProjectKey(projectName),
      recipeCorrelationKey: correlationKey,
      ...(typeof input.opportunity.companyId === 'string' &&
      input.opportunity.companyId.length > 0
        ? { companyId: input.opportunity.companyId }
        : {}),
    },
  };

  if (!input.isChatInstalled) {
    return {
      correlationKey,
      steps: [project],
      skipped: [{ kind: 'CREATE_CHANNEL', reason: 'CHAT_NOT_INSTALLED' }],
    };
  }

  const channel: DealWonChannelWrite = {
    kind: 'CREATE_CHANNEL',
    correlationKey: deriveDealWonChannelCorrelationKey(correlationKey),
    writes: {
      name: deriveDealWonChannelName(projectName),
      kind: DEAL_WON_CHANNEL_KIND,
      visibility: DEAL_WON_CHANNEL_VISIBILITY,
      topic: `Suivi du projet ${projectName}`,
      projectIdSource: 'CREATED_PROJECT',
    },
  };

  return { correlationKey, steps: [project, channel], skipped: [] };
};
