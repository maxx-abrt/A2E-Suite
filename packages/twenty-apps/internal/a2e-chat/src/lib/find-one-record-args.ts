// Single-record reads through the Core API.
//
// Twenty's generated findOne resolvers (`chatChannel`, …) take one required
// `filter` argument and no `id` argument (server get-resolver-args.util.ts:
// findOne → `{ filter: NonNull }`). A `chatChannel(id: …)` read makes the
// generated genql client throw (`no typing defined for argument \`id\``)
// before any request, so the channel-scoped assistant tools failed on every
// call. Reads build their findOne `__args` here instead. Mutations are
// unaffected: updateOne/deleteOne really are keyed by `id`.
export type FindOneByIdArgs = {
  filter: { id: { eq: string } };
};

export const buildFindOneByIdArgs = (id: string): FindOneByIdArgs => ({
  filter: { id: { eq: id } },
});
