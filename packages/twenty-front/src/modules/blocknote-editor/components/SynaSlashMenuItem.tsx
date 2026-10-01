import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettingsPath } from 'twenty-shared/utils';
import { SettingsPath } from 'twenty-shared/types';
import { IconPlug, IconSparkles } from 'twenty-ui/icon';

import { SYNA_DOCUMENT_AI_ACTIONS } from '@/ai/constants/synaDocumentAiActions';
import { useContextToolButtons } from '@/ai/hooks/useContextToolButtons';
import { useOpenAskAiPageWithPreprompt } from '@/ai/hooks/useOpenAskAiPageWithPreprompt';
import { useWorkspaceAiModelAvailability } from '@/ai/hooks/useWorkspaceAiModelAvailability';
import { getOfferedSynaActions } from '@/ai/utils/getOfferedSynaActions';
import { isSynaAvailable } from '@/ai/utils/isSynaAvailable';
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
// with no provider configured, admins get a single "Connect a provider" entry
// (members get nothing — no dead entries), per the M10d contract.
export const SynaSlashMenuItem = ({ children }: SynaSlashMenuItemProps) => {
  const hasAiPermissionFlag = useHasPermissionFlag(PermissionFlagType.AI);
  const hasAiSettingsPermission = useHasPermissionFlag(
    PermissionFlagType.AI_SETTINGS,
  );
  const { hasConfiguredAiProvider } = useWorkspaceAiModelAvailability();
  const navigate = useNavigate();

  if (isSynaAvailable({ hasAiPermissionFlag, hasConfiguredAiProvider })) {
    return <SynaSlashMenuItemContent>{children}</SynaSlashMenuItemContent>;
  }

  if (hasAiPermissionFlag && hasAiSettingsPermission) {
    return children([
      {
        title: i18n._(msg`Connect a provider`),
        aliases: ['connect', 'provider', 'connecter'],
        group: i18n._(SLASH_MENU_GROUP_LABELS.syna),
        groupKey: 'syna',
        Icon: IconPlug,
        onItemClick: () => navigate(getSettingsPath(SettingsPath.AiProviders)),
      },
    ]);
  }

  return children([]);
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
