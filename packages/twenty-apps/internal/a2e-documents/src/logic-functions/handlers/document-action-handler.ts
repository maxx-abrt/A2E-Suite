import {
  coreClient,
  readDocumentContent,
  type CoreClientLike,
  type DocumentContentMetadata,
  type DocumentContentStatus,
} from './document-content-handler.ts';

// LECTURE SEULE, SOUS L'AUTORISATION DE L'APPELANT (P9.2).
//
// Summarize, translate and improve-writing are three action entry points that
// all delegate to the ONE authorized read path shipped in US-013
// (`readDocumentContent`): they add the action intent and its validated
// parameters, never a second read. The LLM transformation stays in the
// assistant; this handler only supplies the caller-authorized content and
// never writes (C6: draft + confirm is a separate mutation).
//
// A provided-but-invalid option (blank target language, non-integer word
// budget, non-string tone) is a caller mistake, so it fails closed before any
// read rather than silently defaulting.

export type DocumentAiAction =
  | 'SUMMARIZE'
  | 'TRANSLATE'
  | 'IMPROVE_WRITING';

export type DocumentActionOptions = {
  targetLanguage: string | null;
  tone: string | null;
  maxWords: number | null;
};

export type DocumentActionResult = {
  status: DocumentContentStatus;
  action: DocumentAiAction;
  documentId: string;
  blocknote: string | null;
  metadata: DocumentContentMetadata | null;
  options: DocumentActionOptions;
};

export type DocumentActionInput = {
  documentId?: string;
  targetLanguage?: string;
  tone?: string;
  maxWords?: number;
};

const MAX_TARGET_LANGUAGE_LENGTH = 60;
const MAX_TONE_LENGTH = 60;
const MAX_MAX_WORDS = 2000;
const MIN_MAX_WORDS = 1;

const emptyOptions: DocumentActionOptions = {
  targetLanguage: null,
  tone: null,
  maxWords: null,
};

type NormalizedText =
  | { valid: true; value: string | null }
  | { valid: false };

const normalizeOptionalText = (
  value: unknown,
  maxLength: number,
): NormalizedText => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return { valid: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return { valid: false };
  }

  return { valid: true, value: trimmed };
};

type NormalizedMaxWords =
  | { valid: true; value: number | null }
  | { valid: false };

const normalizeOptionalMaxWords = (value: unknown): NormalizedMaxWords => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_MAX_WORDS ||
    value > MAX_MAX_WORDS
  ) {
    return { valid: false };
  }

  return { valid: true, value };
};

// Only the option the action declares is meaningful, but any malformed value
// is still refused so a caller cannot smuggle an unvalidated parameter through
// an action that ignores it.
const resolveOptions = (
  input: DocumentActionInput,
  action: DocumentAiAction,
): DocumentActionOptions | undefined => {
  const targetLanguage = normalizeOptionalText(
    input.targetLanguage,
    MAX_TARGET_LANGUAGE_LENGTH,
  );
  const tone = normalizeOptionalText(input.tone, MAX_TONE_LENGTH);
  const maxWords = normalizeOptionalMaxWords(input.maxWords);

  if (!targetLanguage.valid || !tone.valid || !maxWords.valid) {
    return undefined;
  }

  // Translation without a target language cannot be dispatched.
  if (action === 'TRANSLATE' && targetLanguage.value === null) {
    return undefined;
  }

  return {
    targetLanguage: targetLanguage.value,
    tone: tone.value,
    maxWords: maxWords.value,
  };
};

export const runDocumentAction = async (
  input: DocumentActionInput,
  action: DocumentAiAction,
  client: CoreClientLike = coreClient(),
): Promise<DocumentActionResult> => {
  const documentId =
    typeof input.documentId === 'string' ? input.documentId.trim() : '';

  const options = resolveOptions(input, action);

  if (options === undefined) {
    return {
      status: 'INVALID_INPUT',
      action,
      documentId,
      blocknote: null,
      metadata: null,
      options: emptyOptions,
    };
  }

  const content = await readDocumentContent({ documentId }, client);

  return {
    status: content.status,
    action,
    documentId: content.documentId,
    blocknote: content.blocknote,
    metadata: content.metadata,
    options,
  };
};
