// Deterministic task extraction for the P9.2 « extraire les tâches d'un
// document » tool. Pure and read-only on purpose: the tool proposes, the
// assistant/user reviews, and a separate confirmed action creates the tasks
// (C6). The blocknote body is the serialized block array the RICH_TEXT field
// stores; anything absent or unparseable yields no proposal rather than an
// error — a broken body must never surface as a false task.

export type ExtractTasksFromDocumentProposedTask = {
  title: string;
  description?: string;
};

type BlockNoteBlock = {
  type?: unknown;
  content?: unknown;
  props?: unknown;
  children?: unknown;
};

const MAX_IMPERATIVE_LENGTH = 160;

// Conservative on purpose: only a small, explicit action-verb lexicon may turn
// a heading or paragraph into a task, so ordinary prose is never harvested.
// Both French (the workspace language) and English are accepted.
const IMPERATIVE_VERBS = new Set([
  'ajouter',
  'appeler',
  'corriger',
  'créer',
  'envoyer',
  'faire',
  'finaliser',
  'mettre',
  'organiser',
  'planifier',
  'préparer',
  'relancer',
  'rédiger',
  'réviser',
  'signer',
  'suivre',
  'tester',
  'traiter',
  'valider',
  'vérifier',
  'add',
  'check',
  'create',
  'fix',
  'prepare',
  'review',
  'send',
  'test',
  'update',
  'verify',
  'write',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const flattenInlineContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (isRecord(item)) {
        if (typeof item.text === 'string') {
          return item.text;
        }

        return flattenInlineContent(item.content);
      }

      return '';
    })
    .join('');
};

const flattenBlockText = (block: BlockNoteBlock): string =>
  normalizeText(flattenInlineContent(block.content));

const isChecked = (block: BlockNoteBlock): boolean =>
  isRecord(block.props) && block.props.checked === true;

// One short, non-question sentence whose first word is a known action verb.
// A mid-text sentence break (`… . …`) disqualifies it: imperative one-liners
// do not carry a second sentence.
const isImperativeCandidate = (text: string): boolean => {
  if (text === '' || text.length > MAX_IMPERATIVE_LENGTH) {
    return false;
  }

  if (text.includes('?') || /[.!?]\s+\S/.test(text)) {
    return false;
  }

  const firstWord = (text.split(/\s+/)[0] ?? '')
    .toLowerCase()
    .replace(/[«»"':;,.!]+$/, '');

  return IMPERATIVE_VERBS.has(firstWord);
};

const buildProposal = (
  title: string,
  section: string | undefined,
): ExtractTasksFromDocumentProposedTask =>
  section === undefined || section === title
    ? { title }
    : { title, description: section };

const parseBlocknote = (blocknote: string | null | undefined): unknown[] => {
  if (typeof blocknote !== 'string' || blocknote.trim() === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(blocknote);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Depth-first document order. A heading is never dropped: it becomes the
// section context of the blocks that follow (so a checklist item can say
// which part of the document it came from), and is itself proposed only when
// it reads as an action.
const visitBlocks = (
  blocks: unknown[],
  section: string | undefined,
  proposals: ExtractTasksFromDocumentProposedTask[],
  seenTitles: Set<string>,
): void => {
  const push = (
    title: string,
    descriptionSection: string | undefined,
  ): void => {
    const key = title.toLowerCase().replace(/[.!]+$/, '');

    if (seenTitles.has(key)) {
      return;
    }

    seenTitles.add(key);
    proposals.push(buildProposal(title, descriptionSection));
  };

  for (const candidate of blocks) {
    if (!isRecord(candidate)) {
      continue;
    }

    const block = candidate as BlockNoteBlock;
    const text = flattenBlockText(block);
    const currentSection = section;

    if (block.type === 'heading') {
      if (text !== '') {
        if (isImperativeCandidate(text)) {
          push(text, currentSection);
        }

        section = text;
      }
    } else if (block.type === 'checkListItem') {
      if (!isChecked(block) && text !== '') {
        push(text, currentSection);
      }
    } else if (block.type === 'paragraph' && isImperativeCandidate(text)) {
      push(text, currentSection);
    }

    if (Array.isArray(block.children)) {
      visitBlocks(block.children, section, proposals, seenTitles);
    }
  }
};

export const extractTaskProposals = (
  blocknote: string | null | undefined,
): ExtractTasksFromDocumentProposedTask[] => {
  const proposals: ExtractTasksFromDocumentProposedTask[] = [];

  visitBlocks(parseBlocknote(blocknote), undefined, proposals, new Set());

  return proposals;
};
