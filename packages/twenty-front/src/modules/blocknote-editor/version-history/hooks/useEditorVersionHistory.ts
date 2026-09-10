import { useCallback, useEffect, useState } from 'react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import {
  type EditorVersionSnapshot,
  type EditorVersionHistoryStore,
} from '@/blocknote-editor/version-history/EditorVersionHistoryStore';
import { isDefined } from 'twenty-shared/utils';

const SNAPSHOT_INTERVAL_MS = 120_000;
const SNAPSHOT_DEBOUNCE_MS = 5_000;

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

export const useEditorVersionHistory = (
  editor: BlockEditorInstance | null,
  versionHistoryStore: EditorVersionHistoryStore,
): {
  versions: EditorVersionSnapshot[];
  takeSnapshot: () => void;
} => {
  const [versions, setVersions] = useState<EditorVersionSnapshot[]>([]);

  const takeSnapshot = useCallback(() => {
    if (!isDefined(editor)) {
      return;
    }

    versionHistoryStore.addSnapshot(JSON.stringify(editor.document));
  }, [editor, versionHistoryStore]);

  useEffect(() => {
    if (!isDefined(editor)) {
      setVersions([]);
      return undefined;
    }

    const unsubscribe = versionHistoryStore.subscribe(() => {
      setVersions(versionHistoryStore.getVersions());
    });

    let latestChangeAt = Date.now();
    let hasChangesSinceSnapshot = false;

    const unsubscribeChange = editor.onChange(() => {
      hasChangesSinceSnapshot = true;
      latestChangeAt = Date.now();
    });

    // Save-interval: snapshot only after SNAPSHOT_DEBOUNCE_MS of typing calm,
    // and at most one snapshot per SNAPSHOT_INTERVAL_MS, pruning handled
    // inside the store ring buffer.
    const intervalId = setInterval(() => {
      if (
        !hasChangesSinceSnapshot ||
        Date.now() - latestChangeAt < SNAPSHOT_DEBOUNCE_MS
      ) {
        return;
      }

      hasChangesSinceSnapshot = false;
      takeSnapshot();
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      unsubscribeChange();
      unsubscribe();
    };
  }, [editor, takeSnapshot, versionHistoryStore]);

  return { versions, takeSnapshot };
};
