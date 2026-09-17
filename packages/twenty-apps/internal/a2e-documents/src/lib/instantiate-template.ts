import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';

// Template instantiation is payload construction only: the copy is a fresh
// DOCUMENT record whose body is the template's, with every block anchor
// re-keyed. The caller owns persistence, so this stays free of transport
// concerns and unit-testable.
//
// C1 requires fresh content identities when a template is instantiated:
// blocknote block ids are the anchors block/comment state hangs off, so a copy
// that reused the template's ids would alias it. Comment thread ids are the one
// exception — the `documentCommentThread.threadId` contract keeps them stable,
// only the block anchors move.

export type TemplateRichTextBody = {
  blocknote?: string | null;
  markdown?: string | null;
};

export type TemplateCopySource = {
  title: string;
  content?: TemplateRichTextBody | null;
};

export type FetchedTemplateRecord = {
  id: string;
  title: string;
  kind?: string | null;
  content?: TemplateRichTextBody | null;
};

export type TemplateCopyPayload = {
  title: string;
  kind: string;
  position: string;
  content: {
    blocknote: string | null;
    markdown: string | null;
  };
};

export const TEMPLATE_TITLE_PREFIX = 'Modèle — ';

// Same opening position the browser uses for every new root document; callers
// pass a fractional index (twenty-shared generateFractionalIndexBetween) when
// they want deterministic interleaving instead.
export const DEFAULT_TEMPLATE_COPY_POSITION = 'V';

const BLOCK_ID_LENGTH = 8;

// Blocknote block ids are 8-character opaque strings; the sandbox has WebCrypto
// so a UUID slice is indistinguishable from an editor-minted id. The fallback
// keeps the default generator total when WebCrypto is unavailable.
const createRandomBlockId = (): string => {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;

  if (typeof cryptoLike?.randomUUID === 'function') {
    return cryptoLike
      .randomUUID()
      .replace(/-/g, '')
      .slice(0, BLOCK_ID_LENGTH);
  }

  return Math.random().toString(36).slice(2, 2 + BLOCK_ID_LENGTH);
};

// Only the block tree carries anchors: top-level blocks plus `children`.
// Inline content items are not block-identified, so they are not collected —
// remapping them would risk rewriting legitimate text.
const collectTemplateBlockIds = (blocks: unknown, ids: Set<string>): void => {
  if (!Array.isArray(blocks)) {
    return;
  }

  for (const block of blocks) {
    if (block === null || typeof block !== 'object') {
      continue;
    }

    const record = block as Record<string, unknown>;

    if (typeof record.id === 'string' && record.id !== '') {
      ids.add(record.id);
    }

    collectTemplateBlockIds(record.children, ids);
  }
};

// Deep clone that rewrites every string equal to a known block id, so internal
// references (a block prop pointing at another block) survive the re-key while
// arbitrary text cannot be touched unless it is exactly an existing id.
// `threadId` is deliberately skipped: comment identifiers are not anchors.
const remapBlockValue = (
  value: unknown,
  idMap: Map<string, string>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => remapBlockValue(item, idMap));
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && idMap.has(value)) {
      return idMap.get(value);
    }

    return value;
  }

  const record = value as Record<string, unknown>;
  const remappedRecord: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (key === 'threadId') {
      remappedRecord[key] = entry;
      continue;
    }

    remappedRecord[key] = remapBlockValue(entry, idMap);
  }

  return remappedRecord;
};

// Re-keys the serialized blocknote body so the copy's blocks are fresh. Input
// that is absent, empty or not a block array is refused (returns null) rather
// than copied through — instantiation must not duplicate unvalidated content.
export const remapTemplateBlockIds = (
  blocknote: string | null | undefined,
  options: { createBlockId?: () => string } = {},
): string | null => {
  if (typeof blocknote !== 'string' || blocknote.trim() === '') {
    return null;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(blocknote);
  } catch {
    return null;
  }

  if (!Array.isArray(parsedBody)) {
    return null;
  }

  const existingBlockIds = new Set<string>();
  collectTemplateBlockIds(parsedBody, existingBlockIds);

  const createBlockId = options.createBlockId ?? createRandomBlockId;
  const assignedBlockIds = new Set<string>();
  const idMap = new Map<string, string>();

  for (const existingBlockId of existingBlockIds) {
    let candidate = createBlockId();
    let collisionCount = 0;

    while (candidate === '' || assignedBlockIds.has(candidate)) {
      collisionCount += 1;
      candidate = `${createBlockId()}${collisionCount.toString(36)}`;
    }

    assignedBlockIds.add(candidate);
    idMap.set(existingBlockId, candidate);
  }

  return JSON.stringify(remapBlockValue(parsedBody, idMap));
};

export const buildTemplateCopyTitle = (templateTitle: string): string => {
  const strippedTitle = templateTitle.startsWith(TEMPLATE_TITLE_PREFIX)
    ? templateTitle.slice(TEMPLATE_TITLE_PREFIX.length).trim()
    : templateTitle.trim();

  return strippedTitle === '' ? 'Nouveau document' : strippedTitle;
};

// The authorized read is the permission gate: the API returns a template record
// only when the caller may read it, so a null fetch means "not authorized, or
// gone" and instantiation fails closed instead of creating an empty copy.
export const readAuthorizedTemplateCopySource = (
  fetchedTemplate: FetchedTemplateRecord | null | undefined,
): TemplateCopySource | null =>
  fetchedTemplate === null || fetchedTemplate === undefined
    ? null
    : {
        title: fetchedTemplate.title,
        content: fetchedTemplate.content ?? null,
      };

// Relations and system fields (parent, company, person, id, archivedAt,
// isFavorite) are intentionally absent from the payload: a template's live
// links and provenance never travel into a copy, only the title and body do.
export const buildTemplateCopyPayload = (
  source: TemplateCopySource,
  options: { position?: string; createBlockId?: () => string } = {},
): TemplateCopyPayload => ({
  title: buildTemplateCopyTitle(source.title),
  kind: DOCUMENT_KIND.DOCUMENT,
  position: options.position ?? DEFAULT_TEMPLATE_COPY_POSITION,
  content: {
    blocknote: remapTemplateBlockIds(source.content?.blocknote, options),
    markdown: source.content?.markdown ?? null,
  },
});
