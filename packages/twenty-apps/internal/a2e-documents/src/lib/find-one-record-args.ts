// Single-record reads through the Core API.
//
// Twenty's generated findOne resolvers (`document`, `note`, …) take one
// required `filter` argument and no `id` argument (server
// get-resolver-args.util.ts: findOne → `{ filter: NonNull }`). The generated
// genql client throws `no typing defined for argument \`id\`` for a
// `document(id: …)` read before any request is sent, so the page widget, the
// template re-fetch and the document AI tools failed on their first read.
// Reads build their findOne `__args` here instead. Mutations are unaffected:
// updateOne/deleteOne really are keyed by `id`.
export type FindOneByIdArgs = {
  filter: { id: { eq: string } };
};

export const buildFindOneByIdArgs = (id: string): FindOneByIdArgs => ({
  filter: { id: { eq: id } },
});
