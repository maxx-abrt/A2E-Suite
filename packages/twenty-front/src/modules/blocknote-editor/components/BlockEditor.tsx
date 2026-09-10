import {
  filterSuggestionItems,
  SuggestionMenu,
} from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { useEffect, useMemo, type ClipboardEvent, useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { getSlashMenu } from '@/blocknote-editor/utils/getSlashMenu';
import { CustomMentionMenu } from '@/blocknote-editor/components/CustomMentionMenu';
import { CustomSideMenu } from '@/blocknote-editor/components/CustomSideMenu';
import {
  CustomSlashMenu,
  type SuggestionItem,
} from '@/blocknote-editor/components/CustomSlashMenu';
import { LinkToRecordSlashMenuItem } from '@/blocknote-editor/components/LinkToRecordSlashMenuItem';
import { BlockEditorRemoteCursorsEffect } from '@/blocknote-editor/co-editing/components/BlockEditorRemoteCursorsEffect';
import { useDocumentCursors } from '@/blocknote-editor/co-editing/hooks/useDocumentCursors';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { BlockEditorStatusBar } from '@/blocknote-editor/editor-status/components/BlockEditorStatusBar';
import { isEditorTypewriterModeEnabledState } from '@/blocknote-editor/editor-status/states/isEditorTypewriterModeEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMentionMenu } from '@/mention/hooks/useMentionMenu';
import { BlockEditorExportMenu } from '@/blocknote-editor/export/components/BlockEditorExportMenu';
import { BlockEditorVersionHistoryPanel } from '@/blocknote-editor/version-history/components/BlockEditorVersionHistoryPanel';
import { EditorVersionHistoryStore } from '@/blocknote-editor/version-history/EditorVersionHistoryStore';
import { IconX } from 'twenty-ui/icon';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

type BlockEditorProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
  documentTitle?: string;
  // Defined only for full-page document editors: co-editing carets need a
  // stable record id to scope presence topics and version checks.
  documentRecordId?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onPaste?: (event: ClipboardEvent) => void;
  onChange?: () => void;
  readonly?: boolean;
};

// oxlint-disable-next-line twenty/no-hardcoded-colors
const StyledEditor = styled.div`
  max-width: 100%;
  min-width: 0;
  width: 100%;

  & .editor {
    background: transparent;
    color: ${themeCssVariables.font.color.primary};
    font-size: 13px;
    min-height: 400px;
  }
  & .editor [class^='_inlineContent']:before {
    color: ${themeCssVariables.font.color.tertiary};
    font-style: normal !important;
  }
  & .editor .bn-inline-content:has(> .ProseMirror-trailingBreak):before {
    font-style: normal;
  }
  & .mantine-ActionIcon-icon {
    background: transparent;
    height: 20px;
    width: 20px;
  }
  & .bn-container .bn-drag-handle {
    height: 20px;
    width: 20px;
  }
  & .bn-block-content[data-content-type='checkListItem'] > div > div {
    align-items: center;
    display: flex;
  }
  & .bn-drag-handle-menu {
    backdrop-filter: ${themeCssVariables.blur.medium};
    background: ${themeCssVariables.background.transparent.secondary};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.md};
    box-shadow:
      0px 2px 4px rgba(0, 0, 0, 0.04),
      2px 4px 16px rgba(0, 0, 0, 0.12);
    left: 26px;
    min-height: 96px;
    min-width: 160px;
    padding: 4px;
  }

  & .bn-editor {
    padding-inline: 0px;
  }

  & .bn-block-content {
    min-width: 0;
  }

  & .bn-block-content,
  & .bn-inline-content {
    overflow-wrap: anywhere;
  }

  & .bn-inline-content {
    max-width: 100%;
    min-width: 0;
  }

  & .bn-container .bn-suggestion-menu-item:hover {
    background-color: blue;
  }

  & .bn-suggestion-menu {
    backdrop-filter: ${themeCssVariables.blur.medium};
    background: ${themeCssVariables.background.transparent.secondary};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.md};
    padding: 4px;
  }

  & .mantine-Menu-item {
    background-color: transparent;
    color: ${themeCssVariables.font.color.secondary};
    font-family: ${themeCssVariables.font.family};

    font-style: normal;
    font-weight: ${themeCssVariables.font.weight.regular};
    min-height: 32px;
    min-width: 152px;
  }
  & .mantine-ActionIcon-root:hover {
    backdrop-filter: blur(20px);
    background: ${themeCssVariables.background.transparent.primary};
    border: 1px solid ${themeCssVariables.border.color.light};
    box-shadow:
      0px 0px 4px rgba(0, 0, 0, 0.08),
      0px 2px 4px rgba(0, 0, 0, 0.04);
  }
  & .bn-side-menu .mantine-UnstyledButton-root:not(.mantine-Menu-item) svg {
    height: 16px;
    width: 16px;
  }

  & .bn-mantine .bn-side-menu > [draggable='true'] {
    margin-bottom: 5px;
  }
  & .bn-color-picker-dropdown {
    margin-left: 8px;
  }

  & .bn-inline-content a {
    color: ${themeCssVariables.color.blue};
  }

  & .bn-inline-content code {
    background-color: ${themeCssVariables.background.transparent.light};
    border: 1px solid ${themeCssVariables.font.color.extraLight};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: ${themeCssVariables.font.color.danger};
    font-family: monospace;
    font-size: 0.9rem;
    padding: 2px 4px;
  }

  & .bn-mantine {
    container-type: inline-size;
  }

  & .bn-mantine .bn-panel {
    width: min(500px, 100cqi);
  }
`;

export const BlockEditor = ({
  editor,
  documentTitle = 'document',
  documentRecordId,
  onFocus,
  onBlur,
  onChange,
  onPaste,
  readonly,
}: BlockEditorProps) => {
  const isEditorTypewriterModeEnabled = useAtomStateValue(
    isEditorTypewriterModeEnabledState,
  );
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );

  // Hooks must stay unconditional even when co-editing is not wired up yet.
  const { remoteCursors, publishCursor } = useDocumentCursors({
    documentRecordId: documentRecordId ?? '',
  });
  const coEditingEnabled = isDefined(documentRecordId);

  // Presence members identify by workspace member id; the cursor hook keeps
  // the raw userId so the name lookup falls back gracefully when the roster
  // has not loaded yet.
  const memberNameByUserId = useMemo(() => {
    const memberNameByUserId = new Map<string, string>();

    for (const workspaceMember of currentWorkspaceMembers) {
      if (isDefined(workspaceMember.userWorkspaceId)) {
        memberNameByUserId.set(
          workspaceMember.userWorkspaceId,
          [workspaceMember.name?.firstName, workspaceMember.name?.lastName]
            .filter(isDefined)
            .join(' ')
            .trim() || workspaceMember.userEmail,
        );
      }
    }

    return memberNameByUserId;
  }, [currentWorkspaceMembers]);

  // Publishing the caret on every selection event would flood the presence
  // channel: blocknote's selection listener already coalesces keystrokes.
  useEffect(() => {
    if (!coEditingEnabled) {
      return;
    }

    const unsubscribe = editor.onSelectionChange((updatedEditor) => {
      const cursorBlock = updatedEditor.getTextCursorPosition().block;

      publishCursor(isDefined(cursorBlock) ? cursorBlock.id : null);
    });

    return () => {
      unsubscribe();
      publishCursor(null);
    };
  }, [editor, publishCursor, coEditingEnabled]);

  // Same lifecycle contract as the comments thread store: created once per
  // editor instance; recreating it per render would drop all snapshots.
  const versionHistoryStore = useMemo(
    () => new EditorVersionHistoryStore(),
    [],
  );
  const { colorScheme } = useContext(ThemeContext);
  const { t } = useLingui();

  const blockNoteTheme = colorScheme === 'light' ? 'light' : 'dark';
  const getMentionItems = useMentionMenu(editor);

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
  };

  const handleChange = () => {
    onChange?.();
  };

  const handlePaste = (event: ClipboardEvent) => {
    onPaste?.(event);
  };

  // Typewriter mode keeps the caret block vertically centered: scrolling the
  // current block to the middle of the viewport after every caret move.
  const handleTypewriterCaretMove = (caretElement: HTMLElement) => {
    if (!isEditorTypewriterModeEnabled) {
      return;
    }

    caretElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <StyledEditor>
      <BlockNoteView
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onChange={handleChange}
        editor={editor}
        theme={blockNoteTheme}
        slashMenu={false}
        sideMenu={false}
        editable={!readonly}
      >
        <CustomSideMenu editor={editor} />
        <LinkToRecordSlashMenuItem>
          {(linkToRecordItem) => {
            const slashMenuWithLinkToRecord = () => [
              ...getSlashMenu(editor),
              linkToRecordItem,
            ];

            return (
              <SuggestionMenuController
                triggerCharacter="/"
                getItems={async (query: string) => {
                  const filtered = filterSuggestionItems<SuggestionItem>(
                    slashMenuWithLinkToRecord(),
                    query,
                  );

                  if (filtered.length > 0) {
                    return filtered;
                  }

                  return [
                    {
                      title: t`Close menu`,
                      Icon: IconX,
                      onItemClick: () =>
                        editor.getExtension(SuggestionMenu)?.closeMenu(),
                    },
                  ];
                }}
                suggestionMenuComponent={CustomSlashMenu}
              />
            );
          }}
        </LinkToRecordSlashMenuItem>
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => getMentionItems(query)}
          suggestionMenuComponent={CustomMentionMenu}
        />
      </BlockNoteView>
      <BlockEditorStatusBar
        editor={editor}
        onTypewriterCaretMove={handleTypewriterCaretMove}
      />
      <BlockEditorVersionHistoryPanel
        editor={editor}
        versionHistoryStore={versionHistoryStore}
      />
      <BlockEditorExportMenu editor={editor} documentTitle={documentTitle} />
      {coEditingEnabled ? (
        <BlockEditorRemoteCursorsEffect
          editorDomElement={editor.domElement ?? null}
          remoteCursors={remoteCursors}
          memberNameByUserId={memberNameByUserId}
        />
      ) : null}
    </StyledEditor>
  );
};
