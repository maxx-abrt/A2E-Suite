import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useState } from 'react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { useBlockEditorOutline } from '@/blocknote-editor/editor-status/hooks/useBlockEditorOutline';
import { getBlockWordCount } from '@/blocknote-editor/editor-status/utils/getBlockWordCount';
import { isEditorOutlineOpenState } from '@/blocknote-editor/editor-status/states/isEditorOutlineOpenState';
import { isEditorTypewriterModeEnabledState } from '@/blocknote-editor/editor-status/states/isEditorTypewriterModeEnabledState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { IconFocusCentered, IconLayoutList } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';

const OUTLINE_INDENT_STEP_PX = 12;

const StyledStatusBar = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: 0 ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[1]};
  user-select: none;
  width: 100%;
`;

const StyledStatusBarButton = styled.button<{ isHighlighted?: boolean }>`
  align-items: center;
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledOutlinePanel = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.superHeavy};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]} 0;
  max-height: 240px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
  width: calc(100% - 2 * ${themeCssVariables.spacing[2]});
`;

const StyledOutlineEntry = styled.button<{
  indentLevel: number;
  isActive: boolean;
}>`
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  padding-left: ${({ indentLevel }) =>
    `calc(${themeCssVariables.spacing[2]} + ${indentLevel} * ${OUTLINE_INDENT_STEP_PX}px)`};
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background-color: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledWordCount = styled.span`
  white-space: nowrap;
`;

type BlockEditorStatusBarProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor | null;
  onTypewriterCaretMove?: (caretElement: HTMLElement) => void;
};

export const BlockEditorStatusBar = ({
  editor,
  onTypewriterCaretMove,
}: BlockEditorStatusBarProps) => {
  const { t } = useLingui();

  const outline = useBlockEditorOutline(editor);

  const [wordCount, setWordCount] = useState(0);

  const [isEditorOutlineOpen, setIsEditorOutlineOpen] = useAtomState(
    isEditorOutlineOpenState,
  );

  const [isEditorTypewriterModeEnabled, setIsEditorTypewriterModeEnabled] =
    useAtomState(isEditorTypewriterModeEnabledState);

  const [activeHeadingBlockId, setActiveHeadingBlockId] = useState<
    string | undefined
  >(undefined);

  // Typewriter mode scrolls the caret into view; refetch on every selection
  // change so the following block stays vertically centered while typing.
  useEffect(() => {
    if (!isEditorTypewriterModeEnabled || !isDefined(editor)) {
      return;
    }

    const unsubscribe = editor.onSelectionChange(() => {
      onTypewriterCaretMove?.(
        editor.prosemirrorView.dom.querySelector('.ProseMirror-has-neons') ??
          editor.domElement?.querySelector('.bn-block-content') ??
          (editor.prosemirrorView.dom as HTMLElement),
      );
    });

    return () => {
      unsubscribe();
    };
  }, [editor, isEditorTypewriterModeEnabled, onTypewriterCaretMove]);

  useEffect(() => {
    if (!isDefined(editor)) {
      setWordCount(0);
      return;
    }

    setWordCount(getBlockWordCount(editor.document));

    const unsubscribe = editor.onChange(() => {
      setWordCount(getBlockWordCount(editor.document));
    });

    return () => {
      unsubscribe();
    };
  }, [editor]);

  useEffect(() => {
    if (!isDefined(editor) || outline.length === 0) {
      return;
    }

    const unsubscribe = editor.onSelectionChange((updatedEditor) => {
      const cursorBlock = updatedEditor.getTextCursorPosition().block;

      setActiveHeadingBlockId(cursorBlock.id);
    });

    return () => {
      unsubscribe();
    };
  }, [editor, outline.length]);

  const handleOutlineEntryClick = useCallback(
    (blockId: string) => {
      if (!isDefined(editor)) {
        return;
      }

      editor.setTextCursorPosition(blockId, 'start');
      editor.focus();
    },
    [editor],
  );

  const hasNoStatusContent = outline.length === 0 && wordCount === 0;

  if (!isDefined(editor) || (hasNoStatusContent && !isEditorOutlineOpen)) {
    return null;
  }

  return (
    <>
      {isEditorOutlineOpen && outline.length > 0 && (
        <StyledOutlinePanel>
          {outline.map((outlineEntry) => (
            <StyledOutlineEntry
              key={outlineEntry.blockId}
              indentLevel={outlineEntry.level - 1}
              isActive={activeHeadingBlockId === outlineEntry.blockId}
              onClick={() => handleOutlineEntryClick(outlineEntry.blockId)}
            >
              {outlineEntry.text || t`Untitled section`}
            </StyledOutlineEntry>
          ))}
        </StyledOutlinePanel>
      )}
      <StyledStatusBar>
        <StyledStatusBarButton
          onClick={() => setIsEditorOutlineOpen(!isEditorOutlineOpen)}
          isHighlighted={isEditorOutlineOpen}
          title={t`Toggle outline`}
        >
          <IconLayoutList size={14} />
        </StyledStatusBarButton>
        <StyledStatusBarButton
          onClick={() =>
            setIsEditorTypewriterModeEnabled(!isEditorTypewriterModeEnabled)
          }
          isHighlighted={isEditorTypewriterModeEnabled}
          title={t`Typewriter mode`}
        >
          <IconFocusCentered size={14} />
        </StyledStatusBarButton>
        <StyledWordCount>{`${wordCount} ${t`words`}`}</StyledWordCount>
      </StyledStatusBar>
    </>
  );
};
