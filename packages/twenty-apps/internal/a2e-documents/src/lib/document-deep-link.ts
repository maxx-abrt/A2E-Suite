// Deep link to a document's record page. The host route is
// /object/:objectNameSingular/:objectRecordId, so the copied link opens the
// page directly. The guest share link (/share/:token) is a separate concept
// owned by document-share-management.ts.
export const buildDocumentDeepLink = (documentId: string): string =>
  `/object/document/${encodeURIComponent(documentId)}`;
