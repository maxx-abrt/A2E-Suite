import { compareSortKeys, effectiveSortKey, midKey, SortKeySpaceError } from "./sort-key";
export type TreeNode = { _id: string; parentId?: string; sortKey?: string; order?: number; createdAt?: number; isArchived?: boolean };
export type TreeZone = "before" | "into" | "after";
export type TreeMove = { documentIds: string[]; targetId?: string; zone: TreeZone };
export type TreePatch = { _id: string; parentId?: string; sortKey: string };

export function isDescendant(nodes: Map<string, TreeNode>, ancestor: string, target: string): boolean {
  const seen = new Set<string>();
  let id: string | undefined = target;
  while (id) {
    if (id === ancestor) return true;
    if (seen.has(id)) throw new Error("The document tree contains a cycle");
    seen.add(id);
    id = nodes.get(id)?.parentId;
  }
  return false;
}

/** A selected parent carries its selected children; never detach them accidentally. */
export function selectedTreeRoots(docs: TreeNode[], ids: string[]): string[] {
  const selected = new Set(ids), byId = new Map(docs.map(d => [d._id, d]));
  return docs.filter(d => selected.has(d._id) && !d.isArchived).filter(d => {
    const seen = new Set([d._id]);
    let parent = d.parentId;
    while (parent) {
      if (seen.has(parent)) throw new Error("The document tree contains a cycle");
      if (selected.has(parent)) return false;
      seen.add(parent); parent = byId.get(parent)?.parentId;
    }
    return true;
  }).sort(compareSortKeys).map(d => d._id);
}

/** Pure, atomic move plan, reused unchanged by server and optimistic UI. */
export function planTreeMove(docs: TreeNode[], move: TreeMove): { patches: TreePatch[]; movedIds: string[]; parentId?: string } {
  if (!move.documentIds.length || move.documentIds.length > 200) throw new Error("Select between 1 and 200 documents");
  const byId = new Map(docs.map(d => [d._id, d]));
  for (const id of move.documentIds) if (!byId.has(id) || byId.get(id)?.isArchived) throw new Error("A selected document is no longer available");
  const target = move.targetId ? byId.get(move.targetId) : undefined;
  if (move.targetId && (!target || target.isArchived)) throw new Error("The destination is no longer available");
  const movedIds = selectedTreeRoots(docs, move.documentIds), moving = new Set(movedIds);
  if (move.targetId && move.documentIds.includes(move.targetId)) throw new Error("Cannot move onto the selection");
  const parentId = target ? (move.zone === "into" ? target._id : target.parentId) : undefined;
  if (parentId) {
    const parent = byId.get(parentId);
    if (!parent || parent.isArchived) throw new Error("The parent is no longer available");
    if (movedIds.some(id => isDescendant(byId, id, parentId))) throw new Error("Cannot move a document into its descendants");
  }
  const siblings = docs.filter(d => !d.isArchived && d.parentId === parentId && !moving.has(d._id)).sort(compareSortKeys);
  let index = siblings.length;
  if (target && move.zone !== "into") {
    const at = siblings.findIndex(d => d._id === target._id);
    if (at < 0) throw new Error("The destination changed; try again");
    index = at + (move.zone === "after" ? 1 : 0);
  }
  let prev = index > 0 ? effectiveSortKey(siblings[index - 1]) : null;
  const next = index < siblings.length ? effectiveSortKey(siblings[index]) : null;
  try {
    const patches = movedIds.map(_id => {
      const sortKey = midKey(prev, next);
      if (sortKey.length > 48) throw new SortKeySpaceError("Rebalance");
      prev = sortKey;
      return { _id, parentId, sortKey };
    });
    return { patches, movedIds, parentId };
  } catch (error) {
    if (!(error instanceof SortKeySpaceError)) throw error;
    // Repair exhausted/duplicate legacy ranks in the SAME transaction, not later.
    const order = siblings.map(d => d._id);
    order.splice(index, 0, ...movedIds);
    return { movedIds, parentId, patches: order.map((_id, i) => ({ _id, parentId, sortKey: `m${((i + 1) * 1024).toString(36).padStart(10, "0")}` })) };
  }
}

export function flattenTree<T extends TreeNode>(docs: T[], openIds: Set<string>): Array<{ doc: T; depth: number; hasChildren: boolean }> {
  const ids = new Set(docs.map(d => d._id)), byParent = new Map<string | undefined, T[]>();
  for (const doc of docs) {
    // A visible child of an inaccessible/deleted parent must remain reachable.
    const parent = doc.parentId && ids.has(doc.parentId) ? doc.parentId : undefined;
    const children = byParent.get(parent) ?? []; children.push(doc); byParent.set(parent, children);
  }
  for (const children of byParent.values()) children.sort(compareSortKeys);
  const rows: Array<{ doc: T; depth: number; hasChildren: boolean }> = [], seen = new Set<string>();
  const visit = (roots: T[]) => {
    const stack = roots.slice().reverse().map(doc => ({ doc, depth: 0 }));
    while (stack.length) {
      const { doc, depth } = stack.pop()!;
      if (seen.has(doc._id)) continue;
      seen.add(doc._id);
      const children = byParent.get(doc._id) ?? [];
      rows.push({ doc, depth, hasChildren: children.length > 0 });
      if (openIds.has(doc._id)) for (let i = children.length - 1; i >= 0; i--) stack.push({ doc: children[i], depth: depth + 1 });
    }
  };
  visit(byParent.get(undefined) ?? []);
  return rows;
}
