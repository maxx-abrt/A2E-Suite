import {
  resolveDriveSourceApp,
  searchDriveFiles,
  type DriveFileSearchCandidate,
  type DriveSearchFile,
} from '../../lib/drive-file-search.ts';
import {
  coreClient,
  readDriveAttachments,
  readOptionalToolFilter,
  type CoreClientLike,
  type DriveAttachmentRecord,
} from './drive-tool-support.ts';

// READ-ONLY FILE SEARCH (P9.2 find-file).
//
// The assistant asks "find the invoice PDF from X" and receives ranked
// attachment candidates with a Drive deep link and the match that produced
// them. Keyword + metadata only — no embedding model. The handler reads
// through the caller-context Core API client, so the platform hides records
// the caller cannot see; it never writes (C6). Ranking lives in the pure
// `searchDriveFiles` so its order is unit-pinned.

export type FindFileInput = {
  query?: string;
  sourceApp?: string;
  folderId?: string;
  type?: string;
};

export type FindFileStatus = 'FOUND' | 'EMPTY' | 'INVALID_INPUT';

export type FindFileResult = {
  status: FindFileStatus;
  query: string;
  candidates: DriveFileSearchCandidate[];
  totalMatches: number;
  truncated: boolean;
};

const toSearchFile = (record: DriveAttachmentRecord): DriveSearchFile => ({
  id: record.id,
  name: record.name,
  description: record.description,
  sourceApp: resolveDriveSourceApp({
    sourceApp: record.sourceApp,
    hasTarget: record.hasTarget,
  }),
  folderId: record.folderId,
  folderName: record.folderName,
  mimeType: record.mimeType,
  fileCategory: record.fileCategory,
  extension: record.extension,
  createdAt: record.createdAt,
});

export const findDriveFile = async (
  input: FindFileInput,
  client: CoreClientLike = coreClient(),
): Promise<FindFileResult> => {
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  const sourceApp = readOptionalToolFilter(input.sourceApp);
  const folderId = readOptionalToolFilter(input.folderId);
  const type = readOptionalToolFilter(input.type);

  const invalid = (): FindFileResult => ({
    status: 'INVALID_INPUT',
    query,
    candidates: [],
    totalMatches: 0,
    truncated: false,
  });

  if (query === '' || !sourceApp.valid || !folderId.valid || !type.valid) {
    return invalid();
  }

  const records = await readDriveAttachments(client);
  const result = searchDriveFiles({
    query,
    files: records.map(toSearchFile),
    filters: {
      sourceApp: sourceApp.value,
      folderId: folderId.value,
      type: type.value,
    },
  });

  return {
    status: result.totalMatches > 0 ? 'FOUND' : 'EMPTY',
    query: result.query,
    candidates: result.candidates,
    totalMatches: result.totalMatches,
    truncated: result.truncated,
  };
};
