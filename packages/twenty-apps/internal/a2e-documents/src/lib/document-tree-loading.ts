// Lazy tree loading.
//
// The browser used to fetch every root plus one child level in a single query,
// so a deep tree still needed eager queries for every extra level. Here each
// parent is fetched on demand through its own cursor page, keeping navigation
// cost bounded by what is actually visible. Pure page-state helpers only — the
// browser owns the network, so merge/boundary logic stays unit-testable.

export const TREE_CHILDREN_PAGE_SIZE = 50;

export type TreeChildrenPage<TNode extends { id: string }> = {
  nodes: TNode[];
  endCursor: string | null;
  hasNextPage: boolean;
};

export type TreeParentPageState = {
  isLoaded: boolean;
  endCursor: string | null;
  hasNextPage: boolean;
};

export const createTreeParentPageState = (): TreeParentPageState => ({
  isLoaded: false,
  endCursor: null,
  hasNextPage: true,
});

// A refetch after a mutation can return rows already held in memory (the page
// boundary moved), so first occurrences win and a node never renders twice.
export const mergeTreeChildrenPage = <TNode extends { id: string }>(
  loadedNodes: TNode[],
  pageNodes: TNode[],
): TNode[] => {
  const knownIds = new Set(loadedNodes.map((node) => node.id));
  const mergedNodes = [...loadedNodes];

  for (const node of pageNodes) {
    if (!knownIds.has(node.id)) {
      knownIds.add(node.id);
      mergedNodes.push(node);
    }
  }

  return mergedNodes;
};

export const needsInitialChildrenFetch = (
  state: TreeParentPageState | undefined,
): boolean => state === undefined || !state.isLoaded;

export const hasNextChildrenPage = (
  state: TreeParentPageState | undefined,
): boolean => state !== undefined && state.isLoaded && state.hasNextPage;

export type TreeNestedNode<TNode> = TNode & {
  children?: { edges: { node: TreeNestedNode<TNode> }[] };
};

// The move/keyboard helpers take the nested shape, so rebuild it from the
// per-parent pages. The visited set breaks an accidental cycle on corrupted
// data instead of recursing forever.
export const nestTreeFromChildrenMap = <TNode extends { id: string }>(
  childrenByParentId: Map<string | null, TNode[]>,
): TreeNestedNode<TNode>[] => {
  const visitedIds = new Set<string>();

  const nest = (parentId: string | null): TreeNestedNode<TNode>[] => {
    const nodes = childrenByParentId.get(parentId) ?? [];

    return nodes.flatMap((node) => {
      if (visitedIds.has(node.id)) {
        return [];
      }

      visitedIds.add(node.id);

      const childNodes = nest(node.id);

      return [
        childNodes.length === 0
          ? node
          : {
              ...node,
              children: { edges: childNodes.map((child) => ({ node: child })) },
            },
      ];
    });
  };

  return nest(null);
};
