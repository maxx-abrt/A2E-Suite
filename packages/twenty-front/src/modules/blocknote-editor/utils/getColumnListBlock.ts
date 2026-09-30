// Structural shape only: the blocknote runtime cannot be imported under Jest,
// and `PartialBlock` is awkward to name here. `insertOrUpdateBlockForSlashMenu`
// accepts this shape structurally.
export type ColumnListBlockLike = {
  type: 'columnList';
  children: {
    type: 'column';
    children: { type: 'paragraph' }[];
  }[];
};

export const getColumnListBlock = (
  columnCount: number,
): ColumnListBlockLike => ({
  type: 'columnList',
  children: Array.from({ length: columnCount }, () => ({
    type: 'column' as const,
    children: [{ type: 'paragraph' as const }],
  })),
});
