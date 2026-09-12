/** Shared by the optimistic tree and Convex; never return an out-of-bounds key. */
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
export class SortKeySpaceError extends Error {}

export function base36Key(n: number): string {
  const value = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)).toString(36);
  return value.length.toString(36) + value;
}

export function midKey(prev: string | null, next: string | null): string {
  if (prev != null && next != null && prev >= next) throw new SortKeySpaceError("Sort keys need rebalancing");
  if (next == null) return (prev ?? "") + "i";
  const lower = prev ?? "";
  let prefix = "";
  for (let i = 0; i < next.length; i++) {
    const a = i < lower.length ? DIGITS.indexOf(lower[i]) : -1;
    const b = DIGITS.indexOf(next[i]);
    if (b < 0 || (i < lower.length && a < 0)) throw new SortKeySpaceError("Invalid sort key");
    if (a === b) { prefix += next[i]; continue; }
    if (b - a > 1) return prefix + DIGITS[Math.floor((a + b) / 2)];
    if (a >= 0) return lower + "i";
    // lower is a prefix: 'a' < 'a0' has no midpoint; 'a' < 'a00' does.
    if (i + 1 < next.length) return prefix + next[i];
    break;
  }
  throw new SortKeySpaceError("Sort keys need rebalancing");
}
export function sortKeyAfter(after: string | null | undefined): string { return midKey(after ?? null, null); }
export type Sortable = { _id?: string; sortKey?: string; order?: number; createdAt?: number };
export function effectiveSortKey(doc: Sortable): string { return doc.sortKey ?? base36Key(doc.order ?? doc.createdAt ?? 0); }
export function compareSortKeys(a: Sortable, b: Sortable): number {
  const ka = effectiveSortKey(a), kb = effectiveSortKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  return (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0) || String(a._id ?? "").localeCompare(String(b._id ?? ""));
}
