// Client-side expected-revision save token for a2e-documents `document` saves
// (P3.2). The server guard `guard-document-revision-save` compares the token a
// writer expected against the committed one and repairs a stale write, so the
// token must be stable per commit and comparable as a plain string. The
// sentinel is used when no prior revision exists yet.
export const FIRST_DOCUMENT_CONTENT_REVISION = 'docrev-first';

export const createDocumentContentRevision = (): string =>
  `docrev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
