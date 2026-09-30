import { createReactBlockSpec, useBlockNoteEditor } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type BlockOutlineEntry,
  getBlockOutline,
} from '@/blocknote-editor/editor-status/utils/getBlockOutline';

const StyledTableOfContents = styled.nav`
  border-left: 2px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: ${themeCssVariables.spacing[2]} 0;
  padding: ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[1]}
    ${themeCssVariables.spacing[3]};
`;

const StyledEntry = styled.button<{ $level: number }>`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ $level }) =>
    $level <= 1
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  padding-left: ${({ $level }) => `${(Math.min($level, 6) - 1) * 12}px`};
  text-align: left;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledEmptyState = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-style: italic;
`;

export const getTableOfContentsEntries = (editor: {
  document: unknown;
}): BlockOutlineEntry[] => getBlockOutline(editor.document);

const TableOfContentsRender = () => {
  const editor = useBlockNoteEditor();
  const { t } = useLingui();

  const [entries, setEntries] = useState<BlockOutlineEntry[]>(() =>
    getTableOfContentsEntries(editor),
  );

  // The outline is derived from the whole document, so it must refresh on
  // every change (including edits in sibling blocks) rather than only on the
  // ToC block's own updates.
  useEffect(() => {
    const refreshEntries = () => setEntries(getTableOfContentsEntries(editor));

    refreshEntries();

    const unsubscribe = editor.onChange(() => refreshEntries());

    return () => unsubscribe();
  }, [editor]);

  const handleEntryClick = (blockId: string) => {
    if (!isDefined(editor.getBlock(blockId))) {
      return;
    }

    editor.setTextCursorPosition(blockId, 'start');
    editor.focus();

    editor.domElement
      ?.querySelector(`[data-id="${blockId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (entries.length === 0) {
    return (
      <StyledTableOfContents aria-label={t`Table of contents`}>
        <StyledEmptyState>{t`No headings yet`}</StyledEmptyState>
      </StyledTableOfContents>
    );
  }

  return (
    <StyledTableOfContents aria-label={t`Table of contents`}>
      {entries.map((entry) => (
        <StyledEntry
          key={entry.blockId}
          type="button"
          $level={entry.level}
          onClick={() => handleEntryClick(entry.blockId)}
        >
          {entry.text.length > 0 ? entry.text : t`Untitled heading`}
        </StyledEntry>
      ))}
    </StyledTableOfContents>
  );
};

// The external-HTML renderer runs through react-dom/server, outside the editor
// context, so it derives the outline from the `editor` prop instead of the
// `useBlockNoteEditor` hook.
const TableOfContentsExternalHtml = ({
  editor,
}: {
  editor: { document: unknown };
}) => {
  const entries = getTableOfContentsEntries(editor);

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.blockId}>{entry.text}</li>
      ))}
    </ul>
  );
};

export const TableOfContentsBlock = createReactBlockSpec(
  {
    type: 'tableOfContents',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => <TableOfContentsRender />,
    toExternalHTML: ({ editor }) => (
      <TableOfContentsExternalHtml
        editor={editor as unknown as { document: unknown }}
      />
    ),
  },
);
