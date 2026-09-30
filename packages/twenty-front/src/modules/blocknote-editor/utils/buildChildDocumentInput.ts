export type ChildDocumentInput = {
  title: string;
  kind: 'DOCUMENT';
  parentId?: string;
};

// Payload that turns a page-link block into a real child in the document tree.
// `parentId` is the current document when the editor knows it (full-page
// document editors carry `documentRecordId`); without it the page is created at
// the root rather than failing. `kind` is set explicitly so the app object's
// DEFAULT never has to be relied upon at the API boundary.
export const buildChildDocumentInput = ({
  title,
  parentDocumentId,
}: {
  title: string;
  parentDocumentId?: string;
}): ChildDocumentInput => {
  const trimmedTitle = title.trim();

  return {
    title: trimmedTitle,
    kind: 'DOCUMENT',
    ...(parentDocumentId ? { parentId: parentDocumentId } : {}),
  };
};
