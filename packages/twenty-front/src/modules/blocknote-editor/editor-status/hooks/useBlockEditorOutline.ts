import { useCallback, useEffect, useState } from 'react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import {
  type BlockOutlineEntry,
  getBlockOutline,
} from '@/blocknote-editor/editor-status/utils/getBlockOutline';
import { isDefined } from 'twenty-shared/utils';

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

// Outline follows the document (onChange) and the cursor (onSelectionChange);
// the change callback also fires on selection-only updates, so the two
// subscriptions coalesce into one state shape instead of two rerenders.
export const useBlockEditorOutline = (
  editor: BlockEditorInstance | null,
): BlockOutlineEntry[] => {
  const [outline, setOutline] = useState<BlockOutlineEntry[]>([]);

  const refreshOutline = useCallback(() => {
    if (!isDefined(editor)) {
      return;
    }

    setOutline(getBlockOutline(editor.document));
  }, [editor]);

  useEffect(() => {
    if (!isDefined(editor)) {
      setOutline([]);
      return;
    }

    refreshOutline();

    const unsubscribeChange = editor.onChange(() => refreshOutline());

    return () => {
      unsubscribeChange();
    };
  }, [editor, refreshOutline]);

  return outline;
};
