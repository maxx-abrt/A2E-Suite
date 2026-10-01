import { i18n } from '@lingui/core';
import {
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useComponentsContext,
} from '@blocknote/react';
import { useMemo, type ReactNode } from 'react';
import { IconSparkles } from 'twenty-ui/icon';

import { SYNA_DOCUMENT_AI_ACTIONS } from '@/ai/constants/synaDocumentAiActions';
import { useContextToolButtons } from '@/ai/hooks/useContextToolButtons';
import { useOpenAskAiPageWithPreprompt } from '@/ai/hooks/useOpenAskAiPageWithPreprompt';
import { useWorkspaceAiModelAvailability } from '@/ai/hooks/useWorkspaceAiModelAvailability';
import { buildSynaSelectionPrompt } from '@/ai/utils/buildSynaSelectionPrompt';
import { getOfferedSynaActions } from '@/ai/utils/getOfferedSynaActions';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PermissionFlagType } from '~/generated-metadata/graphql';

// Replacement for BlockNote's default formatting toolbar: it renders the exact
// default controls (same `getFormattingToolbarItems` the built-in toolbar uses,
// so no style or button drifts) and appends the Syna selection entries after
// them. The outer gate mirrors `SynaSlashMenuItem`: with the AI flag off or no
// enabled model the default toolbar is returned untouched, which is the
// zero-AI contract (no dead entries).
const FormattingToolbarWithSyna = () => (
  <FormattingToolbar>
    {getFormattingToolbarItems()}
    <SynaFormattingToolbarButtons />
  </FormattingToolbar>
);

export const SynaFormattingToolbar = (): ReactNode => (
  <FormattingToolbarController formattingToolbar={FormattingToolbarWithSyna} />
);

const SynaFormattingToolbarButtons = () => {
  const hasAiPermissionFlag = useHasPermissionFlag(PermissionFlagType.AI);
  const { enabledModels } = useWorkspaceAiModelAvailability();

  if (!hasAiPermissionFlag || enabledModels.length === 0) {
    return null;
  }

  return <SynaFormattingToolbarButtonsContent />;
};

const SynaFormattingToolbarButtonsContent = () => {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const contextToolButtons = useContextToolButtons();
  const { openAskAiPageWithPreprompt } = useOpenAskAiPageWithPreprompt();

  const availableReadOnlyToolNames = useMemo(
    () => new Set(contextToolButtons.map((button) => button.toolName)),
    [contextToolButtons],
  );

  const offeredActions = getOfferedSynaActions({
    actions: SYNA_DOCUMENT_AI_ACTIONS,
    hasAiPermissionFlag: true,
    hasAvailableModel: true,
    availableReadOnlyToolNames,
  });

  if (!Components) {
    return null;
  }

  return (
    <>
      {offeredActions.map((action) => (
        <Components.FormattingToolbar.Button
          key={action.key}
          className="bn-button"
          label={i18n._(action.label)}
          mainTooltip={i18n._(action.label)}
          icon={<IconSparkles size={16} />}
          onClick={() => {
            // Read the live selection at click time: the toolbar's floating
            // options keep focus in the editor, so the range is still intact.
            openAskAiPageWithPreprompt({
              text: buildSynaSelectionPrompt(action, editor.getSelectedText()),
              mode: 'PREFILL',
            });
          }}
        />
      ))}
    </>
  );
};
