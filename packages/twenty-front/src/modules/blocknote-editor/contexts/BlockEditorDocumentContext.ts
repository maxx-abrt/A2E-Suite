import { createContext } from 'react';

// The id of the `document` record the editor is open on, or null when the
// editor is not a full-page document (notes, dashboards). Page-link blocks read
// it to nest a freshly created page under the current document; without it the
// page is created at the root instead.
export const BlockEditorDocumentContext = createContext<string | null>(null);
