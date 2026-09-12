import {
  defineObject,
  FieldType,
} from 'twenty-sdk/define';

import { oneToMany } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Shared colored tags. A junction row per task↔label pair implements the
// attachment many-to-many (labels object + junction per P4.1); the row
// CASCADEs in both directions so neither side orphans the other.
export default defineObject({
  universalIdentifier: OBJECT_IDS.label,
  nameSingular: 'label',
  namePlural: 'labels',
  labelSingular: 'Étiquette',
  labelPlural: 'Étiquettes',
  description: 'Étiquette colorée pour classer les tâches.',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.labelName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.labelName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31a0600-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'color',
      label: 'Couleur',
      description: 'Couleur Twenty (rose, turquoise…)',
      icon: 'IconAbc',
      defaultValue: "'gray'",
    },
    {
      universalIdentifier: 'c31a0700-0002-4000-8000-000000000003',
      type: FieldType.RELATION,
      name: 'taskLabel',
      label: 'Rattachements',
      icon: 'IconTag',
      description: 'Tâches portant cette étiquette (lignes de liaison)',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.taskLabel,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.taskLabelLabel,
      universalSettings: oneToMany,
    },
  ],
});
