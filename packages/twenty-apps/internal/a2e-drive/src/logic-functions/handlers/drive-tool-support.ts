import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared plumbing for the read-only P9.2 Drive tools. Both find-file and
// dedupe-hints read the standard `attachment` object extended by a2e-drive
// (folder, sourceApp, description, archivedAt) through the caller-context Core
// API client and flatten the nodes once. Centralizing the read keeps the two
// tools from drifting on selection, ordering or the trashed-file exclusion.
//
// The client is injectable so node:test exercises the reads without a live Core
// API (the generated client throws before generation).

export type CoreClientLike = Pick<CoreApiClient, 'query'>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

export const MAX_DRIVE_ATTACHMENTS_SCANNED = 200;

// A bounded, most-recent-first scan is enough for keyword ranking and duplicate
// grouping; archived (trashed) files are excluded because the tools surface
// only live content.
const ATTACHMENT_SELECTION = {
  id: true,
  name: true,
  description: true,
  sourceApp: true,
  folderId: true,
  type: true,
  fileCategory: true,
  createdAt: true,
  folder: { id: true, name: true },
  file: true,
  targetTaskId: true,
  targetNoteId: true,
  targetPersonId: true,
  targetCompanyId: true,
  targetOpportunityId: true,
  targetDashboardId: true,
  targetWorkflowId: true,
} as const;

const TARGET_ID_FIELDS = [
  'targetTaskId',
  'targetNoteId',
  'targetPersonId',
  'targetCompanyId',
  'targetOpportunityId',
  'targetDashboardId',
  'targetWorkflowId',
] as const;

export type DriveAttachmentNode = {
  id: string;
  name?: string | null;
  description?: string | null;
  sourceApp?: string | null;
  folderId?: string | null;
  type?: string | null;
  fileCategory?: string | null;
  createdAt?: string | null;
  folder?: { id?: string | null; name?: string | null } | null;
  file?: { label?: string | null; extension?: string | null }[] | null;
} & Partial<Record<(typeof TARGET_ID_FIELDS)[number], string | null>>;

export type DriveAttachmentRecord = {
  id: string;
  name: string | null;
  description: string | null;
  sourceApp: string | null;
  folderId: string | null;
  folderName: string | null;
  mimeType: string | null;
  fileCategory: string | null;
  extension: string | null;
  hasTarget: boolean;
  createdAt: string | null;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toRecord = (node: DriveAttachmentNode): DriveAttachmentRecord => ({
  id: node.id,
  // `name` is the native upload label; fall back to the stored FILES label when
  // a record predates it, matching the Drive page's read.
  name: hasText(node.name) ? node.name : (node.file?.[0]?.label ?? null),
  description: node.description ?? null,
  sourceApp: node.sourceApp ?? null,
  folderId: node.folderId ?? null,
  folderName: node.folder?.name ?? null,
  mimeType: node.type ?? null,
  fileCategory: node.fileCategory ?? null,
  extension: node.file?.[0]?.extension ?? null,
  hasTarget: TARGET_ID_FIELDS.some((field) => hasText(node[field])),
  createdAt: node.createdAt ?? null,
});

export const readDriveAttachments = async (
  client: CoreClientLike,
): Promise<DriveAttachmentRecord[]> => {
  const result = (await client.query({
    attachments: {
      __args: {
        filter: { archivedAt: { is: 'NULL' } },
        orderBy: [{ createdAt: 'DescNullsLast' }],
        first: MAX_DRIVE_ATTACHMENTS_SCANNED,
      },
      edges: { node: ATTACHMENT_SELECTION },
    },
  } as never)) as {
    attachments?: { edges?: { node: DriveAttachmentNode }[] };
  };

  return (result?.attachments?.edges ?? []).map((edge) => toRecord(edge.node));
};

// A tool input is JSON: an optional string filter is either absent, a
// non-blank string, or a caller mistake. A provided-but-blank value is refused
// rather than silently treated as "no filter". Shared by both handlers.
export const readOptionalToolFilter = (
  value: unknown,
): { valid: true; value: string | null } | { valid: false } => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return { valid: false };
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return { valid: false };
  }

  return { valid: true, value: trimmed };
};
