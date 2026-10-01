import { FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { SELECT_OPTION_IDS } from './universal-identifiers.ts';

// Shared field vocabulary. `linkType` options are DATA so a user link and a
// mention-derived link render the same color everywhere. Follows the A2E
// Documents/Chat field-vocabulary.ts pattern, including the OptionColor union
// typed here because the SDK keeps TagColor un-exported.
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
  universalIdentifier: string,
  value: string,
  label: string,
  position: number,
  color: OptionColor,
) => ({
  universalIdentifier,
  value,
  label,
  position,
  color,
});

// Discriminator persisted on every junction row: a user-created link (M11a
// picker) and an M8d mention-derived backlink share the one related store.
export const LINK_TYPE = {
  USER_LINK: 'USER_LINK',
  MENTION: 'MENTION',
} as const;

export const linkTypeOptions = [
  option(
    SELECT_OPTION_IDS.linkTypeUserLink,
    LINK_TYPE.USER_LINK,
    'Lien manuel',
    0,
    'blue',
  ),
  option(
    SELECT_OPTION_IDS.linkTypeMention,
    LINK_TYPE.MENTION,
    'Mention',
    1,
    'gray',
  ),
];

// A junction row owns the foreign key, so deleting either linked record
// cascades the link away (the native attachment/targetCompany CASCADE).
export const manyToOne = (joinColumnName: string) =>
  ({
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName,
    onDelete: OnDeleteAction.CASCADE,
  }) as const;

export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export { FieldType };
