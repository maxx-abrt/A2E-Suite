// Morph FK field suffix per linkable object: the join column is
// `${direction}${suffix}Id` (sourceDocumentId, targetTaskId, ...), read from
// the joinColumnName in a2e-links/src/fields/*.field.ts.
export const A2E_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR: Record<
  string,
  string
> = {
  document: 'Document',
  task: 'Task',
};
