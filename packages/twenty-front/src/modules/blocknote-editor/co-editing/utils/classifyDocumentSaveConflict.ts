import {
  resolveOptimisticDocumentUpdate,
  type OptimisticDocumentUpdateResult,
} from '@/blocknote-editor/co-editing/utils/resolveOptimisticDocumentUpdate';
import { getBlockLevelDiff } from '@/blocknote-editor/version-history/utils/getBlockLevelDiff';

// Body shape shared with getBlockLevelDiff; only the fields the block identity
// and text diff read are typed, so a malformed persisted body cannot widen
// `any` into the classification.
type ParsedBlock = {
  id?: string;
  type?: unknown;
  content?: unknown;
  children?: readonly ParsedBlock[];
};

export type DocumentSaveConflictInput = {
  // Serialized blocknote body the local edits were made against.
  baseBody: string;
  // Current local editing state.
  localBody: string;
  // Body currently persisted server-side (a revision the local edits did not
  // see, arriving through the record or a subscription).
  remoteBody: string;
};

const parseBodyBlocks = (body: string): ParsedBlock[] => {
  if (body === '') {
    return [];
  }

  try {
    const parsedBody: unknown = JSON.parse(body);

    return Array.isArray(parsedBody) ? (parsedBody as ParsedBlock[]) : [];
  } catch {
    // A body that no longer parses cannot be diffed; treat it as empty so a
    // corrupt remote value surfaces as added/removed blocks rather than a
    // thrown save path.
    return [];
  }
};

// First caller of resolveOptimisticDocumentUpdate: it feeds the pure helper
// real block ids. `baseVersion`/`latestVersion` are expressed by whether the
// remote body still equals the base — the block overlap is the real merge
// criterion, so no server revision token is required (v1 has no server
// save/merge protocol; see the PLAN P3.2 atomic-save bullet).
export const classifyDocumentSaveConflict = ({
  baseBody,
  localBody,
  remoteBody,
}: DocumentSaveConflictInput): OptimisticDocumentUpdateResult => {
  const baseBlocks = parseBodyBlocks(baseBody);
  const localChangedBlockIds = getBlockLevelDiff(
    baseBlocks,
    parseBodyBlocks(localBody),
  ).map((diffEntry) => diffEntry.blockId);
  const remoteChangedBlockIds = getBlockLevelDiff(
    baseBlocks,
    parseBodyBlocks(remoteBody),
  ).map((diffEntry) => diffEntry.blockId);

  return resolveOptimisticDocumentUpdate({
    baseVersion: 0,
    latestVersion: remoteChangedBlockIds.length > 0 ? 1 : 0,
    localChangedBlockIds,
    remoteChangedBlockIds,
  });
};
