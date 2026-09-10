import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Bilan',
  description:
    "Gestion financière et trésorerie : devis, factures, dépenses et recettes, journal automatique, budgets, fiches officielles françaises (CERFA) et recherche de subventions publiques.",
  author: 'A2E Suite',
  category: 'Productivity',
  serverVariables: {
    AIDES_TERRITOIRES_KEY: {
      description:
        "Clé API Aides-territoires (beta.gouv.fr). Obtenue sur aides-territoires.beta.gouv.fr → Mes paramètres → Ma clé API. Échangée contre un jeton Bearer de 24 h par l'ingestion quotidienne du catalogue de subventions.",
      isSecret: true,
      isRequired: false,
    },
    BILAN_SUBVENTION_SOURCES: {
      description:
        "Sources de subventions activées pour l'ingestion quotidienne, séparées par des virgules. Valeurs possibles : aides-territoires, carenews, curated. Vide = les trois.",
      isSecret: false,
      isRequired: false,
    },
  },
});
