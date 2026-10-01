import { A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';

// The a2e-documents app owns the `document` object; the host can only create
// it once the app's metadata is installed, so every new-page entry-point is
// gated on this identifier rather than probing object metadata (which can
// resolve while an install is still mid-flight).
export const DOCUMENT_OBJECT_NAME_SINGULAR = 'document';

// A captured page starts untitled: `document.title` defaults to '' and opening
// the new record's title cell lets the user name it in place.
export const UNTITLED_DOCUMENT_TITLE = '';

export const isDocumentApplicationInstalled = (
  installedApplicationUniversalIdentifiers: string[],
): boolean =>
  installedApplicationUniversalIdentifiers.includes(
    A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
  );

export type NewPageCreatePlan = {
  objectNameSingular: typeof DOCUMENT_OBJECT_NAME_SINGULAR;
  recordInput: {
    title: string;
  };
};

// No `parentId`: the new page lands at the document tree root, which is the
// user's personal root (the tree filter is `parent IS NULL`), matching the
// app's own root creation.
export const buildNewPageCreatePlan = (): NewPageCreatePlan => ({
  objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
  recordInput: {
    title: UNTITLED_DOCUMENT_TITLE,
  },
});
