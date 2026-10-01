import { defineObject, FieldType } from 'twenty-sdk/define';

import { LINK_TYPE, linkTypeOptions } from '../constants/field-vocabulary.ts';
import { FIELD_IDS, OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Generic cross-app link junction (D-M11A-LINK). A row's two endpoints are
// polymorphic: `source` is the record whose page fired "Link…", `target` is the
// picked record. Each endpoint is a native morph group (one MORPH_RELATION leg
// per declared linkable object, all sharing a morphId); the inverse O2M field
// on each target object is declared by this app in src/fields/. `linkKey` is
// the stable `${sourceObject}:${sourceId}:${targetObject}:${targetId}` dedup
// key (isUnique) US-148 writes; `linkType` distinguishes a user link from an
// M8d mention-derived backlink so both share one related store.
export default defineObject({
  universalIdentifier: OBJECT_IDS.a2eLink,
  nameSingular: 'a2eLink',
  namePlural: 'a2eLinks',
  labelSingular: 'Lien',
  labelPlural: 'Liens',
  description:
    'Jonction de lien générique : un lien entre deux enregistrements quelconques via des cibles morph source et cible.',
  icon: 'IconLink',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.linkKey,
  fields: [
    {
      universalIdentifier: FIELD_IDS.linkKey,
      type: FieldType.TEXT,
      name: 'linkKey',
      label: 'Clé de lien',
      description:
        'Clé stable `${sourceObject}:${sourceId}:${targetObject}:${targetId}` : une seule ligne par paire source/cible.',
      icon: 'IconAbc',
      isUnique: true,
    },
    {
      universalIdentifier: FIELD_IDS.label,
      type: FieldType.TEXT,
      name: 'label',
      label: 'Libellé',
      description:
        'Libellé facultatif du lien, auto-descriptif sans toucher aux objets liés.',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: FIELD_IDS.linkType,
      type: FieldType.SELECT,
      name: 'linkType',
      label: 'Type de lien',
      icon: 'IconCategory',
      defaultValue: `'${LINK_TYPE.USER_LINK}'`,
      options: linkTypeOptions,
    },
  ],
});
