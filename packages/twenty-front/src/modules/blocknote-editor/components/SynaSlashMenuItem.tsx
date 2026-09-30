import { i18n } from '@lingui/core';
import { useMemo } from 'react';
import { IconSparkles } from 'twenty-ui/icon';

import { SYNA_DOCUMENT_AI_ACTIONS } from '@/ai/constants/synaDocumentAiActions';
import { useContextToolButtons } from '@/ai/hooks/useContextToolButtons';
import { useOpenAskAiPageWithPreprompt } from '@/ai/hooks/useOpenAskAiPageWithPreprompt';
import { useWorkspaceAiModelAvailability } from '@/ai/hooks/useWorkspaceAiModelAvailability';
import { getOfferedSynaActions } from '@/ai/utils/getOfferedSynaActions';
import { type SuggestionItem } from '@/blocknote-editor/types/types';
import { SLASH_MENU_GROUP_LABELS } from '@/blocknote-editor/utils/slashMenuGroups';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PermissionFlagType } from '~/generated-metadata/graphql';

type SynaSlashMenuItemProps = {
  children: (items: SuggestionItem[]) => React.ReactNode;
};

type SynaSlashMenuItemContentProps = {
  children: (items: SuggestionItem[]) => React.ReactNode;
};

// The `/syna` slash entries open the assistant with a staged draft — never a
// direct execution — so the user still confirms before anything runs. The
// outer gate keeps the zero-AI case from even mounting the tool-index fetch;
// the inner component can then use the context-tool hooks unconditionally.
export const SynaSlashMenuItem = ({ children }: SynaSlashMenuItemProps) => {
  const hasAiPermissionFlag = useHasPermissionFlag(PermissionFlagType.AI);
  const { enabledModels } = useWorkspaceAiModelAvailability();

  if (!hasAiPermissionFlag || enabledModels.length === 0) {
    return children([]);
  }

  return <SynaSlashMenuItemContent>{children}</SynaSlashMenuItemContent>;
};

const SynaSlashMenuItemContent = ({
  children,
}: SynaSlashMenuItemContentProps) => {
  const contextToolButtons = useContextToolButtons();
  const { openAskAiPageWithPreprompt } = useOpenAskAiPageWithPreprompt();

  const availableReadOnlyToolNames = useMemo(
    () => new Set(contextToolButtons.map((button) => button.toolName)),
    [contextToolButtons],
  );

  const items: SuggestionItem[] = getOfferedSynaActions({
    actions: SYNA_DOCUMENT_AI_ACTIONS,
    hasAiPermissionFlag: true,
    hasAvailableModel: true,
    availableReadOnlyToolNames,
  }).map((action) => ({
    title: i18n._(action.label),
    aliases: action.aliases,
    group: i18n._(SLASH_MENU_GROUP_LABELS.syna),
    groupKey: 'syna',
    Icon: IconSparkles,
    onItemClick: () => {
      openAskAiPageWithPreprompt({
        text: i18n._(action.prompt),
        mode: 'PREFILL',
      });
    },
  }));

  return children(items);
};
