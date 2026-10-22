// The slice of an a2e-documents `document` record the Bureau tree, search and
// trash need. Content is deliberately excluded: only the open page loads it.
export type BureauDocument = {
  __typename: string;
  id: string;
  title: string | null;
  kind?: string | null;
  icon: string | null;
  parentId: string | null;
  position: number | null;
  coverColor: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
