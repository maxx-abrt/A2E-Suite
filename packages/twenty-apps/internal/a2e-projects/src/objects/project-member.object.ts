import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { manyToOne, oneToMany } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

const PROJECT_MEMBER_ROLE_OPTIONS = [
  {
    universalIdentifier: 'c31a0400-0005-4000-8000-000000000001',
    value: 'MEMBER',
    label: 'Membre',
    position: 0,
    color: 'blue' as const,
  },
  {
    universalIdentifier: 'c31a0400-0005-4000-8000-000000000002',
    value: 'LEAD',
    label: 'Responsable',
    position: 1,
    color: 'purple' as const,
  },
  {
    universalIdentifier: 'c31a0400-0005-4000-8000-000000000003',
    value: 'GUEST',
    label: 'Observateur',
    position: 2,
    color: 'gray' as const,
  },
];

// The project × workspaceMember junction that implements "members
// (relation)" — the SDK has no many-to-many primitive; this is the
// sanctioned P4.1 members leg.
export default defineObject({
  universalIdentifier: OBJECT_IDS.projectMember,
  nameSingular: 'projectMember',
  namePlural: 'projectMembers',
  labelSingular: 'Membre projet',
  labelPlural: 'Membres projet',
  description: 'Membre de l’équipe projet, avec son rôle.',
  icon: 'IconUsers',
  fields: [
    {
      universalIdentifier: 'c31a0400-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'memberRole',
      label: 'Rôle',
      icon: 'IconUser',
      defaultValue: `'MEMBER'`,
      options: PROJECT_MEMBER_ROLE_OPTIONS,
    },
    {
      universalIdentifier: RELATION_IDS.projectMemberProject,
      type: FieldType.RELATION,
      name: 'project',
      label: 'Projet',
      icon: 'IconKanban',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.projectMembers,
      universalSettings: {
        ...manyToOne('membershipProjectId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.projectMembers,
      type: FieldType.RELATION,
      name: 'members',
      label: 'Membres',
      icon: 'IconUsers',
      description: 'Équipe du projet (rattachements)',
      relationTargetObjectMetadataUniversalIdentifier:
        OBJECT_IDS.projectMember,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.projectMemberProject,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.projectMemberWorkspaceMember,
      type: FieldType.RELATION,
      name: 'workspaceMember',
      label: 'Membre',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberProjectMemberships,
      universalSettings: {
        ...manyToOne('membershipWorkspaceMemberId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.workspaceMemberProjectMemberships,
      type: FieldType.RELATION,
      name: 'projectMemberships',
      label: 'Appartenances',
      icon: 'IconUsers',
      description: 'Projets où ce membre est rattaché',
      relationTargetObjectMetadataUniversalIdentifier:
        OBJECT_IDS.projectMember,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.projectMemberWorkspaceMember,
      universalSettings: oneToMany,
    },
  ],
});
