// Deterministic Drive file search (P9.2 find-file).
//
// "Semantic-ish" is keyword + metadata first, explicitly (PLAN.md P9.2): there
// is no embedding model or LLM call here. The whole ranking is a pure function
// of the attachment's own text so the unit tests pin an exact order: a field
// PREFIX match (which includes an exact hit) outranks a CONTAINS match, and
// within a tier the most recent upload comes first. Keeping the ranking pure
// and separate from the Core API read keeps it deterministic and testable.

export const DRIVE_APP_PATH = '/drive';

export const DRIVE_SOURCE_APP_CRM = 'crm';
export const DRIVE_SOURCE_APP_UNKNOWN = 'unknown';

// The fields the plan names for keyword search, in match-priority order: the
// record's own text first, then attribution, then the containing folder. A
// PREFIX hit anywhere outranks a CONTAINS hit anywhere; when several fields
// share the winning tier the earliest one in this list is reported.
export const DRIVE_SEARCH_FIELDS = [
  'name',
  'description',
  'sourceApp',
  'folderName',
] as const;

export type DriveSearchField = (typeof DRIVE_SEARCH_FIELDS)[number];

// One attachment, already flattened by the handler. `sourceApp` is the
// resolved attribution (explicit value, else `crm` when the file targets a CRM
// record, else `unknown`) so the filter and the keyword search see the same
// value the Drive page shows.
export type DriveSearchFile = {
  id: string;
  name: string | null;
  description: string | null;
  sourceApp: string | null;
  folderId: string | null;
  folderName: string | null;
  // The attachment's own type surface: `type` (the deprecated mime-ish column)
  // plus `fileCategory`, the stored file extension and the extension parsed
  // from the name. Any of them can satisfy the `type` substring filter.
  mimeType: string | null;
  fileCategory: string | null;
  extension: string | null;
  createdAt: string | null;
};

export type DriveSearchMatchKind = 'PREFIX' | 'CONTAINS';

export type DriveFileSearchCandidate = {
  recordId: string;
  name: string;
  path: string;
  matchKind: DriveSearchMatchKind;
  matchedField: DriveSearchField;
  sourceApp: string;
  folderId: string | null;
  folderName: string | null;
  mimeType: string | null;
  createdAt: string | null;
};

export type DriveFileSearchFilters = {
  sourceApp?: string | null;
  folderId?: string | null;
  type?: string | null;
};

export type DriveFileSearchInput = {
  query: string;
  files: DriveSearchFile[];
  filters?: DriveFileSearchFilters;
  maxResults?: number;
};

export type DriveFileSearchResult = {
  query: string;
  candidates: DriveFileSearchCandidate[];
  totalMatches: number;
  truncated: boolean;
};

export const DEFAULT_DRIVE_FILE_SEARCH_RESULTS = 20;

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalize = (value: string | null | undefined): string =>
  hasText(value) ? value.trim().toLowerCase() : '';

export const readDriveFileExtension = (
  name: string | null | undefined,
): string | null => {
  if (!hasText(name)) {
    return null;
  }

  const lastDotIndex = name.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    return null;
  }

  return name.slice(lastDotIndex + 1).toLowerCase();
};

// Explicit attribution wins; a file attached to a CRM record is attributed to
// the CRM surface when no explicit value was written. Mirrors the Drive page's
// `resolveDriveFileSourceApp` so tool and browser never disagree.
export const resolveDriveSourceApp = ({
  sourceApp,
  hasTarget,
}: {
  sourceApp: string | null | undefined;
  hasTarget: boolean;
}): string => {
  if (hasText(sourceApp)) {
    return sourceApp;
  }

  return hasTarget ? DRIVE_SOURCE_APP_CRM : DRIVE_SOURCE_APP_UNKNOWN;
};

export const displayDriveFileName = (file: {
  id: string;
  name: string | null;
}): string => (hasText(file.name) ? file.name : `#${file.id.slice(0, 8)}`);

const readFieldValue = (
  file: DriveSearchFile,
  field: DriveSearchField,
): string => {
  switch (field) {
    case 'name':
      return normalize(file.name);
    case 'description':
      return normalize(file.description);
    case 'sourceApp':
      return normalize(file.sourceApp);
    case 'folderName':
      return normalize(file.folderName);
  }
};

const matchFile = (
  file: DriveSearchFile,
  query: string,
): { kind: DriveSearchMatchKind; field: DriveSearchField } | null => {
  let containsMatch: {
    kind: DriveSearchMatchKind;
    field: DriveSearchField;
  } | null = null;

  for (const field of DRIVE_SEARCH_FIELDS) {
    const value = readFieldValue(file, field);

    if (value === '') {
      continue;
    }

    if (value.startsWith(query)) {
      return { kind: 'PREFIX', field };
    }

    if (containsMatch === null && value.includes(query)) {
      containsMatch = { kind: 'CONTAINS', field };
    }
  }

  return containsMatch;
};

const hasTypeTokenMatching = (file: DriveSearchFile, typeQuery: string): boolean => {
  const tokens = [
    normalize(file.mimeType),
    normalize(file.fileCategory),
    normalize(file.extension),
    normalize(readDriveFileExtension(file.name)),
  ];

  return tokens.some((token) => token !== '' && token.includes(typeQuery));
};

const matchesFilters = (
  file: DriveSearchFile,
  filters: DriveFileSearchFilters,
): boolean => {
  const sourceApp = normalize(filters.sourceApp);

  if (sourceApp !== '' && normalize(file.sourceApp) !== sourceApp) {
    return false;
  }

  const folderId = hasText(filters.folderId) ? filters.folderId.trim() : '';

  if (folderId !== '' && (file.folderId ?? '') !== folderId) {
    return false;
  }

  const type = normalize(filters.type);

  if (type !== '' && !hasTypeTokenMatching(file, type)) {
    return false;
  }

  return true;
};

const toTimestamp = (iso: string | null): number => {
  if (!hasText(iso)) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(iso);

  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const matchRank = (kind: DriveSearchMatchKind): number =>
  kind === 'PREFIX' ? 0 : 1;

const toCandidate = (
  file: DriveSearchFile,
  match: { kind: DriveSearchMatchKind; field: DriveSearchField },
): DriveFileSearchCandidate => ({
  recordId: file.id,
  name: displayDriveFileName(file),
  path: DRIVE_APP_PATH,
  matchKind: match.kind,
  matchedField: match.field,
  sourceApp: file.sourceApp ?? DRIVE_SOURCE_APP_UNKNOWN,
  folderId: file.folderId,
  folderName: file.folderName,
  mimeType: file.mimeType,
  createdAt: file.createdAt,
});

export const searchDriveFiles = ({
  query,
  files,
  filters = {},
  maxResults = DEFAULT_DRIVE_FILE_SEARCH_RESULTS,
}: DriveFileSearchInput): DriveFileSearchResult => {
  const normalizedQuery = normalize(query);

  if (normalizedQuery === '') {
    return { query: '', candidates: [], totalMatches: 0, truncated: false };
  }

  const scored = files
    .filter((file) => matchesFilters(file, filters))
    .map((file) => ({ file, match: matchFile(file, normalizedQuery) }))
    .filter(
      (
        entry,
      ): entry is {
        file: DriveSearchFile;
        match: { kind: DriveSearchMatchKind; field: DriveSearchField };
      } => entry.match !== null,
    );

  scored.sort((left, right) => {
    const rank = matchRank(left.match.kind) - matchRank(right.match.kind);

    if (rank !== 0) {
      return rank;
    }

    const recency =
      toTimestamp(right.file.createdAt) - toTimestamp(left.file.createdAt);

    if (recency !== 0) {
      return recency;
    }

    return left.file.id.localeCompare(right.file.id);
  });

  const limited = scored.slice(0, Math.max(0, maxResults));

  return {
    query: query.trim(),
    candidates: limited.map((entry) => toCandidate(entry.file, entry.match)),
    totalMatches: scored.length,
    truncated: scored.length > limited.length,
  };
};
