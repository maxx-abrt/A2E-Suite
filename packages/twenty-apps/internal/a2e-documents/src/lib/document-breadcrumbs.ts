// Breadcrumbs for the document page chrome (M8c).
//
// The trail derives from the document tree: the page widget reads the current
// record and walks its `parent` relation upward. Ordering is pure so the walk
// can be tested without the sandbox (the component only fetches the ancestor
// nodes). A missing ancestor stops the walk — the trail is still valid, just
// truncated, which is what a partially-readable tree should render.

export type DocumentBreadcrumbNode = {
  id: string;
  title: string;
  parentId: string | null;
};

const MAX_BREADCRUMB_DEPTH = 32;

export const buildBreadcrumbTrail = ({
  current,
  ancestorsById,
}: {
  current: DocumentBreadcrumbNode;
  ancestorsById: Map<string, DocumentBreadcrumbNode>;
}): DocumentBreadcrumbNode[] => {
  const trailFromRoot: DocumentBreadcrumbNode[] = [];
  const visitedIds = new Set<string>([current.id]);
  let parentId = current.parentId;
  let depth = 0;

  while (parentId !== null && depth < MAX_BREADCRUMB_DEPTH) {
    if (visitedIds.has(parentId)) {
      // A cycle would otherwise loop forever; stop at the repeated id.
      break;
    }

    const ancestor = ancestorsById.get(parentId);

    if (ancestor === undefined) {
      break;
    }

    visitedIds.add(ancestor.id);
    trailFromRoot.push(ancestor);
    parentId = ancestor.parentId;
    depth += 1;
  }

  trailFromRoot.reverse();

  return [...trailFromRoot, current];
};
