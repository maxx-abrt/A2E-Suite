import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// AI COST DISCIPLINE (P9 pre-work).
//
// Every expensive model call in Bilan goes through this cache: the key is
// kind + model + payload digest + catalogue version, so re-opening a heavy
// analysis costs zero token, and a catalogue refresh invalidates exactly the
// runs whose input changed. `response` also doubles as the saved-run store, so
// a user can re-read yesterday's matching without paying for it again.
//
// This session only ships the structure and the rule-based scores. No LLM call
// is wired: that lands with Syna (P9) and the user's own provider keys.
export default defineObject({
  universalIdentifier: OBJECT_IDS.aiCacheEntry,
  nameSingular: 'aiCacheEntry',
  namePlural: 'aiCacheEntries',
  labelSingular: 'Analyse IA',
  labelPlural: 'Cache et analyses IA',
  description:
    "Résultat d'analyse mémorisé : réponse, coût, nombre de réutilisations et version d'entrée. Réouvrir une analyse ne consomme aucun jeton.",
  icon: 'IconSparkles',
  isSearchable: false,
  isUICreatable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.aiCacheEntryKey,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.aiCacheEntryKey,
      type: FieldType.TEXT,
      name: 'cacheKey',
      label: 'Clé de cache',
      icon: 'IconKey',
      defaultValue: "''",
      isUnique: true,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'cacheKind',
      label: 'Nature',
      icon: 'IconCategory',
      defaultValue: "'SUBVENTION_MATCH'",
      options: [
        {
          id: 'b11a0e00-0005-4000-8000-000000000001',
          value: 'SUBVENTION_MATCH',
          label: 'Correspondance de subventions',
          position: 0,
          color: 'green',
        },
        {
          id: 'b11a0e00-0005-4000-8000-000000000002',
          value: 'EXPENSE_CATEGORIZATION',
          label: 'Catégorisation de dépenses',
          position: 1,
          color: 'blue',
        },
        {
          id: 'b11a0e00-0005-4000-8000-000000000003',
          value: 'INVOICE_DRAFT',
          label: 'Brouillon de facture',
          position: 2,
          color: 'purple',
        },
        {
          id: 'b11a0e00-0005-4000-8000-000000000004',
          value: 'ANOMALY_SCAN',
          label: 'Détection d’anomalies',
          position: 3,
          color: 'orange',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000003',
      type: FieldType.TEXT,
      name: 'model',
      label: 'Modèle',
      icon: 'IconCpu',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000004',
      type: FieldType.TEXT,
      name: 'payloadHash',
      label: 'Empreinte des entrées',
      icon: 'IconFingerprint',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000005',
      type: FieldType.NUMBER,
      name: 'catalogVersion',
      label: 'Version du catalogue',
      icon: 'IconVersions',
      defaultValue: 1,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000006',
      type: FieldType.RAW_JSON,
      name: 'response',
      label: 'Résultat',
      icon: 'IconBraces',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000007',
      type: FieldType.NUMBER,
      name: 'hits',
      label: 'Réutilisations',
      icon: 'IconRepeat',
      defaultValue: 0,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000008',
      type: FieldType.NUMBER,
      name: 'costMicros',
      label: 'Coût (micro-crédits)',
      icon: 'IconCoin',
      defaultValue: 0,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-000000000009',
      type: FieldType.DATE_TIME,
      name: 'lastHitAt',
      label: 'Dernière réutilisation',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0e00-0001-4000-8000-00000000000a',
      type: FieldType.DATE_TIME,
      name: 'expiresAt',
      label: 'Expire le',
      icon: 'IconClockOff',
      isNullable: true,
    },
  ],
});
