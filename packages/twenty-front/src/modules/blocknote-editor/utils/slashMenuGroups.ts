import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// The slash-menu sections, in display order. US-122 fills Media/Bureau/Links/
// Syna with the interactive blocks; US-121 only needs the group scaffold plus
// the structural blocks in Basic.
export type SlashMenuGroupKey = 'basic' | 'media' | 'bureau' | 'links' | 'syna';

export const SLASH_MENU_GROUP_ORDER: SlashMenuGroupKey[] = [
  'basic',
  'media',
  'bureau',
  'links',
  'syna',
];

export const SLASH_MENU_GROUP_LABELS: Record<
  SlashMenuGroupKey,
  MessageDescriptor
> = {
  basic: msg`Basic`,
  media: msg`Media`,
  bureau: msg`Bureau`,
  links: msg`Links`,
  syna: msg`Syna`,
};
