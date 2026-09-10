import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// Ingestion bookkeeping: one row per source. A refresh that fails is visible
// here instead of dying in a log, and `catalogVersion` is what invalidates the
// AI cache when the catalogue actually moved.
export default defineObject({
  universalIdentifier: OBJECT_IDS.subventionSource,
  nameSingular: 'subventionSource',
  namePlural: 'subventionSources',
  labelSingular: 'Source de subventions',
  labelPlural: 'Sources de subventions',
  description:
    "État de l'ingestion quotidienne du catalogue : dernière exécution, volumes, version et erreur éventuelle.",
  icon: 'IconDatabaseImport',
  isSearchable: false,
  isUICreatable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.subventionSourceName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.subventionSourceName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'sourceKey',
      label: 'Clé',
      icon: 'IconKey',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000003',
      type: FieldType.BOOLEAN,
      name: 'isEnabled',
      label: 'Activée',
      icon: 'IconToggleRight',
      defaultValue: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000004',
      type: FieldType.DATE_TIME,
      name: 'lastRunAt',
      label: 'Dernière exécution',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000005',
      type: FieldType.DATE_TIME,
      name: 'lastSuccessAt',
      label: 'Dernier succès',
      icon: 'IconCircleCheck',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000006',
      type: FieldType.SELECT,
      name: 'lastRunStatus',
      label: 'Résultat',
      icon: 'IconActivity',
      defaultValue: "'NEVER_RUN'",
      options: [
        {
          id: 'b11a0d00-0005-4000-8000-000000000001',
          value: 'NEVER_RUN',
          label: 'Jamais exécutée',
          position: 0,
          color: 'gray',
        },
        {
          id: 'b11a0d00-0005-4000-8000-000000000002',
          value: 'SUCCESS',
          label: 'Succès',
          position: 1,
          color: 'green',
        },
        {
          id: 'b11a0d00-0005-4000-8000-000000000003',
          value: 'PARTIAL',
          label: 'Partiel',
          position: 2,
          color: 'yellow',
        },
        {
          id: 'b11a0d00-0005-4000-8000-000000000004',
          value: 'FAILED',
          label: 'Échec',
          position: 3,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000007',
      type: FieldType.NUMBER,
      name: 'itemsTotal',
      label: 'Aides annoncées',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000008',
      type: FieldType.NUMBER,
      name: 'itemsIngested',
      label: 'Aides créées',
      icon: 'IconPlus',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-000000000009',
      type: FieldType.NUMBER,
      name: 'itemsUpdated',
      label: 'Aides mises à jour',
      icon: 'IconRefresh',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-00000000000a',
      type: FieldType.NUMBER,
      name: 'catalogVersion',
      label: 'Version du catalogue',
      icon: 'IconVersions',
      defaultValue: 1,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-00000000000b',
      type: FieldType.TEXT,
      name: 'lastError',
      label: 'Dernière erreur',
      icon: 'IconAlertTriangle',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0d00-0001-4000-8000-00000000000c',
      type: FieldType.LINKS,
      name: 'documentationUrl',
      label: 'Documentation',
      icon: 'IconBook2',
      isNullable: true,
    },
  ],
});
