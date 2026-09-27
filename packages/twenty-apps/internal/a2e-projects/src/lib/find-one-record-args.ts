// Single-record reads through the Core API.
//
// Twenty's generated findOne resolvers (`project`, `task`, …) take one
// required `filter` argument and no `id` argument (server
// get-resolver-args.util.ts: findOne → `{ filter: NonNull }`). A query sent as
// `project(id: …)` is rejected by GraphQL validation before any resolver runs,
// so the record-page widgets that did so rendered nothing (P4.2c). Front
// components build their findOne `__args` here instead. Mutations are
// unaffected: updateOne/deleteOne really are keyed by `id`.
export type FindOneByIdArgs = {
  filter: { id: { eq: string } };
};

export const buildFindOneByIdArgs = (id: string): FindOneByIdArgs => ({
  filter: { id: { eq: id } },
});
