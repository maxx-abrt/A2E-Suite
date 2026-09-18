import { FieldType, RelationType } from 'twenty-sdk/define';

// Shared field vocabulary. Options are DATA, so a channel kind/visibility
// renders the same color everywhere. Follows the A2E Documents/Projects
// field-vocabulary.ts pattern, including the OptionColor union typed here
// because the SDK keeps TagColor un-exported.
type OptionColor =
  | 'red'
  | 'ruby'
  | 'crimson'
  | 'tomato'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'grass'
  | 'green'
  | 'jade'
  | 'mint'
  | 'turquoise'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'iris'
  | 'violet'
  | 'purple'
  | 'plum'
  | 'pink'
  | 'bronze'
  | 'gold'
  | 'brown'
  | 'gray';

const option = (
  prefix: string,
  suffix: string,
  value: string,
  label: string,
  position: number,
  color: OptionColor,
) => ({
  universalIdentifier: `${prefix}${suffix}`,
  value,
  label,
  position,
  color,
});

export const CHANNEL_KIND = {
  WORKSPACE: 'WORKSPACE',
  PROJECT: 'PROJECT',
  CUSTOM: 'CUSTOM',
} as const;

export const CHANNEL_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

export const CHANNEL_POSTING_ROLE = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;

export const CHANNEL_MEMBER_ROLE = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;

export const channelKindOptions = [
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '01',
    CHANNEL_KIND.WORKSPACE,
    'Espace de travail',
    0,
    'sky',
  ),
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '02',
    CHANNEL_KIND.PROJECT,
    'Projet',
    1,
    'violet',
  ),
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '03',
    CHANNEL_KIND.CUSTOM,
    'À la demande',
    2,
    'gray',
  ),
];

export const channelVisibilityOptions = [
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '11',
    CHANNEL_VISIBILITY.PUBLIC,
    'Public',
    0,
    'green',
  ),
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '12',
    CHANNEL_VISIBILITY.PRIVATE,
    'Privé',
    1,
    'red',
  ),
];

export const channelPostingRoleOptions = [
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '21',
    CHANNEL_POSTING_ROLE.MEMBER,
    'Membres',
    0,
    'blue',
  ),
  option(
    'c31c0100-0005-4000-8000-0000000000',
    '22',
    CHANNEL_POSTING_ROLE.ADMIN,
    'Administrateurs',
    1,
    'purple',
  ),
];

export const channelMemberRoleOptions = [
  option(
    'c31c0200-0005-4000-8000-0000000000',
    '01',
    CHANNEL_MEMBER_ROLE.OWNER,
    'Propriétaire',
    0,
    'purple',
  ),
  option(
    'c31c0200-0005-4000-8000-0000000000',
    '02',
    CHANNEL_MEMBER_ROLE.MEMBER,
    'Membre',
    1,
    'blue',
  ),
];

export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export const manyToOne = (joinColumnName: string) =>
  ({ relationType: RelationType.MANY_TO_ONE, joinColumnName }) as const;

export { FieldType };
