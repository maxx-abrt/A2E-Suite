import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  documentKindOptions,
  documentTagOptions,
  manyToOne,
  oneToMany,
} from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// The workspace document tree, per the P3.1 spike decision: `note` stays the
// polymorphic CRM attachment surface; `document` is the first-class tree
// entity sharing the same RICH_TEXT stack. Sibling order uses a fractional
// index string (see twenty-shared generateFractionalIndexBetween) so
// drag-reorder never renumbers siblings.
export default defineObject({
  universalIdentifier: OBJECT_IDS.document,
  nameSingular: 'document',
  namePlural: 'documents',
  labelSingular: 'Document',
  labelPlural: 'Documents',
  description:
    'Document de l’espace de travail : arborescence, contenu riche, modèle, favoris et corbeille.',
  icon: 'IconNotes',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.documentTitle,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.documentTitle,
      type: FieldType.TEXT,
      name: 'title',
      label: 'Titre',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000002',
      type: FieldType.RICH_TEXT,
      name: 'content',
      label: 'Contenu',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000003',
      type: FieldType.SELECT,
      name: 'kind',
      label: 'Type',
      icon: 'IconFileText',
      defaultValue: `'DOCUMENT'`,
      options: documentKindOptions,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000004',
      type: FieldType.TEXT,
      name: 'icon',
      label: 'Icône',
      description: 'Nom d’icône twenty-ui affiché dans l’arborescence',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000005',
      type: FieldType.TEXT,
      name: 'coverColor',
      label: 'Couverture',
      description: 'Couleur de la couverture de la page',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      // Fractional index string from twenty-shared; sorting is string order.
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000006',
      type: FieldType.TEXT,
      name: 'position',
      label: 'Position',
      description:
        'Index fractionnaire lexicographique : l’ordre des frères ne se renumérote jamais',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000007',
      type: FieldType.BOOLEAN,
      name: 'isFavorite',
      label: 'Favori',
      icon: 'IconHeart',
      defaultValue: false,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000008',
      type: FieldType.MULTI_SELECT,
      name: 'tags',
      label: 'Étiquettes',
      icon: 'IconTags',
      isNullable: true,
      options: documentTagOptions,
    },
    {
      universalIdentifier: 'c31a0100-0001-4000-8000-000000000009',
      type: FieldType.DATE_TIME,
      name: 'archivedAt',
      label: 'Archivé le',
      description: 'Présent = dans la corbeille (restauration 7 jours)',
      icon: 'IconArchive',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.documentParent,
      type: FieldType.RELATION,
      name: 'parent',
      label: 'Parent',
      icon: 'IconBox',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentChildren,
      universalSettings: {
        ...manyToOne('parentDocumentId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.documentChildren,
      type: FieldType.RELATION,
      name: 'children',
      label: 'Sous-documents',
      icon: 'IconHierarchy',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentParent,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.documentCompany,
      type: FieldType.RELATION,
      name: 'company',
      label: 'Entreprise liée',
      icon: 'IconBuildingSkyscraper',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.companyDocuments,
      universalSettings: {
        ...manyToOne('companyId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.companyDocuments,
      type: FieldType.RELATION,
      name: 'documents',
      label: 'Documents',
      icon: 'IconFiles',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentCompany,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.documentPerson,
      type: FieldType.RELATION,
      name: 'person',
      label: 'Personne liée',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.personDocuments,
      universalSettings: {
        ...manyToOne('personId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.personDocuments,
      type: FieldType.RELATION,
      name: 'documents',
      label: 'Documents',
      icon: 'IconFiles',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentPerson,
      universalSettings: oneToMany,
    },
  ],
});
