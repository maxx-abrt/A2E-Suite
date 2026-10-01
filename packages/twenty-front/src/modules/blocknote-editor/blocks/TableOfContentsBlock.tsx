import { createReactBlockSpec, useBlockNoteEditor } from '@blocknote/react';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import {
  type BlockOutlineEntry,
  getBlockOutline,
} from '@/blocknote-editor/editor-status/utils/getBlockOutline';
import { TableOfContentsView } from '@/blocknote-editor/blocks/views/TableOfContentsView';

export const getTableOfContentsEntries = (editor: {
  document: unknown;
}): BlockOutlineEntry[] => getBlockOutline(editor.document);

const TableOfContentsRender = () => {
  const editor = useBlockNoteEditor();

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

  return (
    <TableOfContentsView entries={entries} onEntryClick={handleEntryClick} />
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
