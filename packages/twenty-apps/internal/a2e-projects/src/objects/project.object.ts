import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  manyToOne,
  oneToMany,
  projectHealthOptions,
  projectStatusOptions,
} from '../constants/field-vocabulary.ts';
import {
  EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS,
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  PROJECT_FIELD_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// The P4 project container. Tasks, milestones and front-facing boards are
// added by later P4.1 bullets; budget/spent are declared now as CURRENCY
// fields and will be fed by the A2E accounting app in P7.1c.
export default defineObject({
  universalIdentifier: OBJECT_IDS.project,
  nameSingular: 'project',
  namePlural: 'projects',
  labelSingular: 'Projet',
  labelPlural: 'Projets',
  description: 'Projet : statut, santé, équipe, jalons, budget et dates clés.',
  icon: 'IconKanban',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.projectName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.projectName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'key',
      label: 'Clé',
      description: 'Préfixe court type PRJ des identifiants de tâches',
      icon: 'IconHash',
      defaultValue: "''",
    },
    {
      // Persisted join counter for task human ids (<KEY>-<n>): the number is
      // minted once and never recomputed, so deleted tasks leave no gap.
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000010',
      type: FieldType.NUMBER,
      name: 'taskCounter',
      label: 'Compteur de tâches',
      description: 'Dernier n attribué aux identifiants de tâches CLÉ-n',
      icon: 'IconCounter',
      defaultValue: 0,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000003',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Statut',
      icon: 'IconProgress',
      defaultValue: `'PLANNING'`,
      options: projectStatusOptions,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000004',
      type: FieldType.SELECT,
      name: 'health',
      label: 'Santé',
      icon: 'IconHeart',
      defaultValue: `'ON_TRACK'`,
      options: projectHealthOptions,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000005',
      type: FieldType.DATE_TIME,
      name: 'startsAt',
      label: 'Début',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000006',
      type: FieldType.DATE_TIME,
      name: 'dueAt',
      label: 'Échéance',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000007',
      type: FieldType.TEXT,
      name: 'color',
      label: 'Couleur',
      description: 'Couleur du projet dans les vues et tableaux',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000008',
      type: FieldType.RICH_TEXT,
      name: 'description',
      label: 'Description',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-000000000009',
      type: FieldType.CURRENCY,
      name: 'budget',
      label: 'Budget',
      description: 'Budget global — alimenté depuis A2E Money (P7)',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31b0200-0001-4000-8000-00000000000a',
      type: FieldType.CURRENCY,
      name: 'spent',
      label: 'Dépensé',
      description: 'Consommé — alimenté depuis A2E Money (P7)',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      // Deal-won recipe provenance (P9.3): the C5 correlation/idempotency key
      // of the trigger that created this project, so a replayed workflow run
      // finds it and skips instead of duplicating. Null on human-made projects.
      universalIdentifier: PROJECT_FIELD_IDS.recipeCorrelationKey,
      type: FieldType.TEXT,
      name: 'recipeCorrelationKey',
      label: 'Clé de recette',
      description:
        'Clé de corrélation/idempotence de la recette qui a créé ce projet',
      icon: 'IconKey',
      isNullable: true,
    },
    {
      // Trash lifecycle field (P4.3): present = in the corbeille, restore
      // clears it, the purge cron destroys past 7 days (P3 mirror).
      universalIdentifier: 'c31b0200-0001-4000-8000-00000000000b',
      type: FieldType.DATE_TIME,
      name: 'archivedAt',
      label: 'Archivé le',
      description: 'Présent = dans la corbeille (restauration 7 jours)',
      icon: 'IconArchive',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.projectLead,
      type: FieldType.RELATION,
      name: 'lead',
      label: 'Responsable',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.memberProjects,
      universalSettings: {
        ...manyToOne('projectLeadId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.projectCompany,
      type: FieldType.RELATION,
      name: 'company',
      label: 'Entreprise',
      icon: 'IconBuildingSkyscraper',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.companyProjects,
      universalSettings: {
        ...manyToOne('companyId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      // Inverse of document.project (P4.3 D-P4.3-DOC): this app owns both
      // sides, so the FK is declared on A2E Documents' object while this
      // inverse lives on our project object. The project page's Documents tab
      // and the overview count read this relation; the widget hides when A2E
      // Documents is not installed (no target object).
      universalIdentifier: RELATION_IDS.projectDocuments,
      type: FieldType.RELATION,
      name: 'documents',
      label: 'Documents',
      description: 'Documents liés à ce projet',
      icon: 'IconNotes',
      relationTargetObjectMetadataUniversalIdentifier:
        EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentProject,
      universalSettings: oneToMany,
    },
  ],
});
