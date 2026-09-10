import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import {
  type BlockDiffEntry,
  getBlockLevelDiff,
} from '@/blocknote-editor/version-history/utils/getBlockLevelDiff';
import {
  type EditorVersionSnapshot,
  type EditorVersionHistoryStore,
} from '@/blocknote-editor/version-history/EditorVersionHistoryStore';
import { useEditorVersionHistory } from '@/blocknote-editor/version-history/hooks/useEditorVersionHistory';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { IconHistory } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';
import { isEditorVersionHistoryOpenState } from '@/blocknote-editor/version-history/states/isEditorVersionHistoryOpenState';

const StyledHistoryPanel = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.superHeavy};
  display: flex;
  flex-direction: column;
  margin: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]} 0;
  max-height: 320px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
  width: calc(100% - 2 * ${themeCssVariables.spacing[2]});
`;

const StyledVersionRow = styled.button<{ isActive: boolean }>`
  align-items: center;
  background: none;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;

  &:hover {
    background-color: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledDiffEntry = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  margin: ${themeCssVariables.spacing[1]} 0;
  padding-left: ${themeCssVariables.spacing[2]};
`;

const StyledDiffRemoved = styled.span`
  background-color: ${themeCssVariables.background.danger};
  text-decoration: line-through;
`;

const StyledDiffAdded = styled.span`
  background-color: ${themeCssVariables.background.transparent.success};
`;

const StyledRestoreButton = styled.button`
  background: none;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const formatTimestamp = (isoTimestamp: string): string =>
  new Date(isoTimestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

type BlockEditorVersionHistoryPanelProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor | null;
  versionHistoryStore: EditorVersionHistoryStore;
};

export const BlockEditorVersionHistoryPanel = ({
  editor,
  versionHistoryStore,
}: BlockEditorVersionHistoryPanelProps) => {
  const { t } = useLingui();

  const { versions } = useEditorVersionHistory(editor, versionHistoryStore);

  const [isEditorVersionHistoryOpen, setIsEditorVersionHistoryOpen] =
    useAtomState(isEditorVersionHistoryOpenState);

  const [selectedVersionId, setSelectedVersionId] = useState<
    string | undefined
  >(undefined);

  const selectedVersion = versions.find(
    (version) => version.versionId === selectedVersionId,
  );

  const [currentBody, setCurrentBody] = useState<string | null>(null);

  const diffEntries: BlockDiffEntry[] = isDefined(selectedVersion)
    ? getBlockLevelDiff(
        isDefined(currentBody) ? JSON.parse(currentBody) : null,
        JSON.parse(selectedVersion.body),
      )
    : [];

  const handleToggle = useCallback(() => {
    if (!isDefined(editor)) {
      return;
    }

    if (!isEditorVersionHistoryOpen) {
      setCurrentBody(JSON.stringify(editor.document));
    }

    setIsEditorVersionHistoryOpen(!isEditorVersionHistoryOpen);
  }, [editor, isEditorVersionHistoryOpen, setIsEditorVersionHistoryOpen]);

  const handleRestore = useCallback(
    (version: EditorVersionSnapshot) => {
      if (!isDefined(editor)) {
        return;
      }

      const restoredBlocks = JSON.parse(version.body);

      editor.replaceBlocks(
        editor.document.map((block) => block.id),
        restoredBlocks,
      );

      setIsEditorVersionHistoryOpen(false);
      setSelectedVersionId(undefined);
    },
    [editor, setIsEditorVersionHistoryOpen],
  );

  if (!isDefined(editor)) {
    return null;
  }

  return (
    <>
      {isEditorVersionHistoryOpen && (
        <StyledHistoryPanel>
          {versions.length === 0 && (
            <StyledDiffEntry>{t`No saved version yet`}</StyledDiffEntry>
          )}
          {versions
            .slice()
            .reverse()
            .map((version) => (
              <StyledVersionRow
                key={version.versionId}
                isActive={version.versionId === selectedVersionId}
                onClick={() => setSelectedVersionId(version.versionId)}
              >
                <span>{formatTimestamp(version.createdAt)}</span>
                {version.versionId === selectedVersionId && (
                  <StyledRestoreButton onClick={() => handleRestore(version)}>
                    {t`Restore`}
                  </StyledRestoreButton>
                )}
              </StyledVersionRow>
            ))}
          {isDefined(selectedVersion) &&
            diffEntries.slice(0, 20).map((diffEntry) => (
              <StyledDiffEntry key={`${diffEntry.blockId}-${diffEntry.status}`}>
                <strong>{diffEntry.blockType}</strong>{' '}
                {diffEntry.status === 'removed' ? (
                  <StyledDiffRemoved>
                    {diffEntry.previousText}
                  </StyledDiffRemoved>
                ) : (
                  <>
                    {diffEntry.status === 'changed' && (
                      <StyledDiffRemoved>
                        {diffEntry.previousText}
                      </StyledDiffRemoved>
                    )}
                    <StyledDiffAdded>{diffEntry.nextText}</StyledDiffAdded>
                  </>
                )}
              </StyledDiffEntry>
            ))}
        </StyledHistoryPanel>
      )}
      <StyledVersionRow
        isActive={isEditorVersionHistoryOpen}
        onClick={handleToggle}
      >
        <IconHistory size={14} />
        <span>{t`Version history`}</span>
      </StyledVersionRow>
    </>
  );
};
