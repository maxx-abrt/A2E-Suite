import { type EncryptedShareBody } from './share-crypto.ts';

// Owner-side share management, kept pure so the browser component only wires
// state and calls the Core API. The representation rule lives here: a share is
// either a plaintext snapshot XOR the ciphertext triple — never both, never a
// partial triple — mirroring the server-side `validateRepresentation`.

export type DocumentShareSummary = {
  shareToken: string;
  isPassphraseProtected: boolean;
  expiresAt: string | null;
};

export type DocumentShareRecord = DocumentShareSummary & {
  documentRecordId: string;
};

export type DocumentShareCreateRequest = {
  documentRecordId: string;
  titleSnapshot: string;
  bodySnapshot: string;
  encryptedBody: string | null;
  bodyIv: string | null;
  bodySalt: string | null;
  expiresAt: string | null;
};

export type ShareBodyEncryptor = (
  bodySnapshot: string,
  passphrase: string,
) => Promise<EncryptedShareBody>;

// AppPath.DocumentShare is '/share/:shareToken'; the token is base64url so
// encoding is a no-op but keeps the helper safe for any token source.
const SHARE_PATH_PREFIX = '/share/';

export const buildDocumentSharePath = (shareToken: string): string =>
  `${SHARE_PATH_PREFIX}${encodeURIComponent(shareToken)}`;

const EXPIRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The expiry picker yields a bare YYYY-MM-DD; the link stays valid through the
// end of that UTC day. An empty or calendar-invalid value means "no expiry"
// rather than a silent epoch date.
export const buildExpiryIso = (dateInput: string): string | null => {
  const trimmedDateInput = dateInput.trim();

  if (!EXPIRY_DATE_PATTERN.test(trimmedDateInput)) {
    return null;
  }

  const parsedDate = new Date(`${trimmedDateInput}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== trimmedDateInput
  ) {
    return null;
  }

  return new Date(`${trimmedDateInput}T23:59:59.999Z`).toISOString();
};

// A passphrase is only "present" when it has non-whitespace characters; the
// raw value (spaces included) is what gets encrypted.
export const hasSharePassphrase = (passphrase: string | undefined): boolean =>
  typeof passphrase === 'string' && passphrase.trim() !== '';

export const buildCreateDocumentShareRequest = async (options: {
  documentRecordId: string;
  titleSnapshot: string;
  bodySnapshot: string;
  passphrase?: string;
  expiresAt?: string | null;
  encryptShareBody: ShareBodyEncryptor;
}): Promise<DocumentShareCreateRequest> => {
  const expiresAt = options.expiresAt ?? null;

  if (!hasSharePassphrase(options.passphrase)) {
    return {
      documentRecordId: options.documentRecordId,
      titleSnapshot: options.titleSnapshot,
      bodySnapshot: options.bodySnapshot,
      encryptedBody: null,
      bodyIv: null,
      bodySalt: null,
      expiresAt,
    };
  }

  const encryptedBody = await options.encryptShareBody(
    options.bodySnapshot,
    options.passphrase ?? '',
  );

  return {
    documentRecordId: options.documentRecordId,
    titleSnapshot: options.titleSnapshot,
    // Ciphertext present ⇒ the plaintext field stays empty so plaintext never
    // travels next to its key material; the server nulls the column.
    bodySnapshot: '',
    encryptedBody: encryptedBody.encryptedBody,
    bodyIv: encryptedBody.bodyIv,
    bodySalt: encryptedBody.bodySalt,
    expiresAt,
  };
};

export const findDocumentShareForDocument = (
  shares: DocumentShareRecord[],
  documentRecordId: string,
): DocumentShareSummary | null => {
  const match = shares.find(
    (share) => share.documentRecordId === documentRecordId,
  );

  if (match === undefined) {
    return null;
  }

  return {
    shareToken: match.shareToken,
    isPassphraseProtected: match.isPassphraseProtected,
    expiresAt: match.expiresAt,
  };
};

export type DocumentSharePanelStatus =
  | 'idle'
  | 'loading'
  | 'creating'
  | 'ready'
  | 'revoking';

export type DocumentSharePanelState = {
  status: DocumentSharePanelStatus;
  shareToken: string | null;
  isPassphraseProtected: boolean;
  expiresAt: string | null;
  error: string | null;
  hasCopied: boolean;
  // Distinguishes a link the owner already had from one just created, so the
  // panel can offer revoke without pretending the create form still applies.
  isExisting: boolean;
};

export const INITIAL_DOCUMENT_SHARE_PANEL_STATE: DocumentSharePanelState = {
  status: 'idle',
  shareToken: null,
  isPassphraseProtected: false,
  expiresAt: null,
  error: null,
  hasCopied: false,
  isExisting: false,
};

export type DocumentSharePanelEvent =
  | { type: 'loadStarted' }
  | { type: 'loadSucceeded'; share: DocumentShareSummary | null }
  | { type: 'createStarted' }
  | { type: 'createSucceeded'; share: DocumentShareSummary }
  | { type: 'copySucceeded' }
  | { type: 'revokeStarted' }
  | { type: 'revokeSucceeded' }
  | { type: 'failed'; message: string }
  | { type: 'reset' };

const readyStateFromShare = (
  share: DocumentShareSummary,
  isExisting: boolean,
): DocumentSharePanelState => ({
  status: 'ready',
  shareToken: share.shareToken,
  isPassphraseProtected: share.isPassphraseProtected,
  expiresAt: share.expiresAt,
  error: null,
  hasCopied: false,
  isExisting,
});

export const reduceDocumentSharePanel = (
  state: DocumentSharePanelState,
  event: DocumentSharePanelEvent,
): DocumentSharePanelState => {
  switch (event.type) {
    case 'loadStarted':
      return { ...INITIAL_DOCUMENT_SHARE_PANEL_STATE, status: 'loading' };
    case 'loadSucceeded':
      return event.share === null
        ? { ...INITIAL_DOCUMENT_SHARE_PANEL_STATE }
        : readyStateFromShare(event.share, true);
    case 'createStarted':
      return { ...state, status: 'creating', error: null };
    case 'createSucceeded':
      return readyStateFromShare(event.share, false);
    case 'copySucceeded':
      return { ...state, hasCopied: true, error: null };
    case 'revokeStarted':
      return { ...state, status: 'revoking', error: null };
    case 'revokeSucceeded':
    case 'reset':
      return { ...INITIAL_DOCUMENT_SHARE_PANEL_STATE };
    case 'failed':
      // A failure before any token exists falls back to the create form; once
      // a token exists the panel must stay on the link so revoke is reachable.
      return {
        ...state,
        status: state.shareToken === null ? 'idle' : 'ready',
        error: event.message,
      };
  }
};
