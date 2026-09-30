import type {
  DefaultReactSuggestionItem,
  SuggestionMenuProps,
} from '@blocknote/react';
import { type IconComponent } from 'twenty-ui/icon';

import { type SlashMenuGroupKey } from '@/blocknote-editor/utils/slashMenuGroups';

export type SuggestionItem = DefaultReactSuggestionItem & {
  aliases?: string[];
  Icon?: IconComponent;
  // Slug of the localized `group` label, used to keep the section order stable
  // regardless of translation.
  groupKey?: SlashMenuGroupKey;
};

export type CustomSlashMenuProps = SuggestionMenuProps<SuggestionItem>;

export type MentionItem = DefaultReactSuggestionItem & {
  recordId?: string;
  objectNameSingular?: string;
  objectMetadataId?: string;
  label?: string;
  imageUrl?: string;
  objectLabelSingular?: string;
};

export type CustomMentionMenuProps = SuggestionMenuProps<MentionItem>;
