import { buildAppendPosition } from './fractional-position.ts';

// "Save as document" from a record copies the linked notes' real bodies into a
// fresh document instead of snapshotting the record title. A record exposes no
// "selected note" primitive at command time, so the caller passes every note
// the authenticated query returned — the API already scopes rows to the
// caller's rights, and `RecordNoteCopyAuthorization` keeps the decision
// explicit and unit-testable. Payload construction only: the caller owns
// transport, exactly like instantiate-template / save-document-as-template.

export type RecordNoteSourceKind = 'company' | 'person';

export type RichTextBody = {
  blocknote?: string | null;
  markdown?: string | null;
};

export type SourceNote = {
  id: string;
  title?: string | null;
  bodyV2?: RichTextBody | null;
};

export type RecordNoteCopySource = {
  objectNameSingular: RecordNoteSourceKind;
  recordId: string;
  recordName?: string | null;
  notes: SourceNote[];
};

export type RecordNoteCopyAuthorization = {
  canReadSourceRecord: boolean;
  canReadSourceNotes: boolean;
};

export type RecordNoteCopyContent = {
  blocknote: string | null;
  markdown: string | null;
};

export type RecordNoteCopyPayload = {
  title: string;
  position: string;
  content: RecordNoteCopyContent;
  companyId?: string;
  personId?: string;
};

// The record label is either a plain text field (company.name) or a composite
// full-name field (person.name) depending on the standard object, so the reader
// normalizes both shapes to a single display string.
export type RecordLabelInput = {
  name?:
    | string
    | { firstName?: string | null; lastName?: string | null }
    | null;
};

export type SourceRecordShape = RecordLabelInput & {
  noteTargets?: {
    edges?: ({ node?: { note?: SourceNote | null } | null } | null)[] | null;
  } | null;
};

export type RecordNoteCopyInput = {
  recordName: string;
  notes: SourceNote[];
  canReadSourceNotes: boolean;
};

type BlockNoteBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: BlockNoteBlock[];
};

export const DEFAULT_DOCUMENT_TITLE = 'Document';
const SOURCE_LINK_LABEL = 'Source';
const NOTE_HEADING_FALLBACK = 'Note';
const NOTE_HEADING_LEVEL = 3;
const SOURCE_LINK_BLOCK_ID = 'a2e-record-source-link';
const NOTE_HEADING_BLOCK_ID_PREFIX = 'a2e-note-heading-';

export const buildRecordSourceHref = (
  objectNameSingular: RecordNoteSourceKind,
  recordId: string,
): string => `/object/${objectNameSingular}/${recordId}`;

export const buildNoteSourceHref = (noteId: string): string =>
  `/object/note/${noteId}`;

const textInlineContent = (text: string) => ({
  type: 'text',
  text,
  styles: {},
});

const linkInlineContent = (label: string, href: string) => ({
  type: 'link',
  href,
  content: [textInlineContent(label)],
});

const parseNoteBlocks = (
  body: RichTextBody | null | undefined,
): BlockNoteBlock[] => {
  const blocknote = body?.blocknote;

  if (typeof blocknote !== 'string' || blocknote.trim() === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(blocknote);

    return Array.isArray(parsed) ? (parsed as BlockNoteBlock[]) : [];
  } catch {
    return [];
  }
};

export const resolveRecordLabel = (
  record: RecordLabelInput | null | undefined,
): string => {
  const name = record?.name;

  if (typeof name === 'string') {
    return name.trim();
  }

  if (name !== null && typeof name === 'object') {
    return [name.firstName, name.lastName]
      .filter((part): part is string => typeof part === 'string')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .join(' ')
      .trim();
  }

  return '';
};

// The API returns relations as connections; a missing connection means the
// caller cannot read the notes at all, while an empty one means "no notes".
export const readRecordNoteCopyInput = (
  sourceRecord: SourceRecordShape | null | undefined,
): RecordNoteCopyInput => {
  const recordName = resolveRecordLabel(sourceRecord);
  const noteTargets = sourceRecord?.noteTargets;

  if (noteTargets === null || noteTargets === undefined) {
    return { recordName, notes: [], canReadSourceNotes: false };
  }

  const edges = Array.isArray(noteTargets.edges) ? noteTargets.edges : [];

  const notes = edges
    .map((edge) => edge?.node?.note)
    .filter(
      (note): note is SourceNote =>
        note !== null &&
        note !== undefined &&
        typeof note.id === 'string' &&
        note.id !== '',
    );

  return { recordName, notes, canReadSourceNotes: true };
};

export const buildRecordSourceLinkBlock = (
  source: Pick<
    RecordNoteCopySource,
    'objectNameSingular' | 'recordId' | 'recordName'
  >,
): BlockNoteBlock => {
  const label = source.recordName?.trim() || DEFAULT_DOCUMENT_TITLE;

  return {
    id: SOURCE_LINK_BLOCK_ID,
    type: 'paragraph',
    content: [
      textInlineContent(`${SOURCE_LINK_LABEL} : `),
      linkInlineContent(
        label,
        buildRecordSourceHref(source.objectNameSingular, source.recordId),
      ),
    ],
  };
};

// Each copied note keeps a heading that links back to its own record page, so
// the document body carries the note-level source link next to the copied body.
export const buildNoteCopyBlocks = (note: SourceNote): BlockNoteBlock[] => {
  const title = note.title?.trim() || NOTE_HEADING_FALLBACK;

  const heading: BlockNoteBlock = {
    id: `${NOTE_HEADING_BLOCK_ID_PREFIX}${note.id}`,
    type: 'heading',
    props: { level: NOTE_HEADING_LEVEL },
    content: [linkInlineContent(title, buildNoteSourceHref(note.id))],
  };

  return [heading, ...parseNoteBlocks(note.bodyV2)];
};

export const buildRecordNoteCopyContent = (
  source: RecordNoteCopySource,
  authorization: Pick<RecordNoteCopyAuthorization, 'canReadSourceNotes'>,
): RecordNoteCopyContent => {
  const recordName =
    source.recordName?.trim() || DEFAULT_DOCUMENT_TITLE;
  const sourceHref = buildRecordSourceHref(
    source.objectNameSingular,
    source.recordId,
  );

  const blocks: BlockNoteBlock[] = [
    buildRecordSourceLinkBlock({ ...source, recordName }),
  ];
  const markdownParts: string[] = [
    `${SOURCE_LINK_LABEL} : [${recordName}](${sourceHref})`,
  ];

  if (authorization.canReadSourceNotes) {
    for (const note of source.notes) {
      blocks.push(...buildNoteCopyBlocks(note));

      const noteMarkdown = note.bodyV2?.markdown;

      if (typeof noteMarkdown === 'string' && noteMarkdown.trim() !== '') {
        markdownParts.push(noteMarkdown.trim());
      }
    }
  }

  return {
    blocknote: JSON.stringify(blocks),
    markdown: markdownParts.join('\n\n'),
  };
};

// Fail-closed on the source-read permission: without it the command creates no
// document at all. When the caller may read the record but not its notes, the
// document is still created with the source link and no note bodies.
export const buildRecordNoteCopyPayload = (
  source: RecordNoteCopySource,
  authorization: RecordNoteCopyAuthorization,
  options: { position?: string } = {},
): RecordNoteCopyPayload | null => {
  if (!authorization.canReadSourceRecord) {
    return null;
  }

  const payload: RecordNoteCopyPayload = {
    title: source.recordName?.trim() || DEFAULT_DOCUMENT_TITLE,
    position: options.position ?? buildAppendPosition(undefined),
    content: buildRecordNoteCopyContent(source, authorization),
  };

  if (source.objectNameSingular === 'company') {
    payload.companyId = source.recordId;
  } else {
    payload.personId = source.recordId;
  }

  return payload;
};
