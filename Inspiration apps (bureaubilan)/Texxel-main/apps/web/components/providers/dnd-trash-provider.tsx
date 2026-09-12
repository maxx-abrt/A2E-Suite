"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, pointerWithin, closestCenter, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { DocumentText } from "iconsax-reactjs";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/hooks/use-flux-workspace";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { compareSortKeys } from "@/lib/sort-key";
import { planTreeMove, selectedTreeRoots, type TreeZone } from "@/lib/document-tree-model";
export type DropZone = TreeZone;
export type DropIntent = { targetId: string; zone: DropZone } | null;
type ActiveDrag = { id: string; documentId: string; title: string; icon?: string; type: "card" | "tree" | "favorite"; selectedIds: string[]; count: number };
type ContextValue = {
  trashingIds: Set<string>; activeDrag: ActiveDrag | null; dropIntent: DropIntent; selectedIds: Set<string>; moving: boolean;
  selectClick: (id: string, e: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => void;
  clearSelection: () => void; registerVisibleOrder: (ids: string[]) => void; bulkTrash: (ids: string[]) => void;
  registerScrollContainer: (el: HTMLElement | null) => void;
};
const Context = createContext<ContextValue>({ trashingIds: new Set(), activeDrag: null, dropIntent: null, selectedIds: new Set(), moving: false, selectClick: () => {}, clearSelection: () => {}, registerVisibleOrder: () => {}, bulkTrash: () => {}, registerScrollContainer: () => {} });
export const useTrashDnd = () => useContext(Context);

export function TrashDndProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspaceId } = useWorkspace();
  const t = useTranslations("workspace");
  const docs = useQuery(api.flux_documents.list, activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip");
  const archive = useMutation(api.flux_documents.archive), restore = useMutation(api.flux_documents.restore);
  const moveMany = useMutation(api.flux_documents.moveMany);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  const intentRef = useRef<DropIntent>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedRef = useRef(selectedIds); selectedRef.current = selectedIds;
  const [trashingIds, setTrashingIds] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const visible = useRef<string[]>([]), anchor = useRef<string | null>(null), scroll = useRef<HTMLElement | null>(null);
  const keyboardZone = useRef<TreeZone>("into");
  const clearSelection = useCallback(() => { selectedRef.current = new Set(); setSelectedIds(new Set()); anchor.current = null; }, []);
  const registerVisibleOrder = useCallback((ids: string[]) => { visible.current = ids; }, []);
  const registerScrollContainer = useCallback((el: HTMLElement | null) => { scroll.current = el; }, []);
  const selectClick = useCallback((id: string, e: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) { clearSelection(); anchor.current = id; return; }
    let next = new Set(selectedRef.current);
    const a = visible.current.indexOf(anchor.current ?? id), b = visible.current.indexOf(id);
    if (e.shiftKey && a >= 0 && b >= 0) next = new Set(visible.current.slice(Math.min(a,b), Math.max(a,b)+1));
    else { next.has(id) ? next.delete(id) : next.add(id); anchor.current = id; }
    selectedRef.current = next; setSelectedIds(next);
  }, [clearSelection]);
  const bulkTrash = useCallback(async (ids: string[]) => {
    const roots = selectedTreeRoots(docs ?? [], ids);
    if (!roots.length) return;
    clearSelection(); setTrashingIds(new Set(roots));
    const result = await Promise.allSettled(roots.map(id => archive({ documentId: id as Id<"flux_documents"> })));
    const saved = roots.filter((_, i) => result[i].status === "fulfilled");
    if (saved.length) toast.success(t("bulkTrashed", { count: saved.length }), { action: { label: t("undo"), onClick: () => {
      void Promise.all(saved.map(id => restore({ documentId: id as Id<"flux_documents"> }))).catch(() => toast.error(t("bulkRestoreFailed")));
    } } });
    if (saved.length !== roots.length) toast.error(t("docMoveTrashFailed"));
    setTrashingIds(new Set());
  }, [archive, restore, docs, clearSelection, t]);
  useEffect(() => {
    clearSelection(); dragRef.current = null; setActiveDrag(null); setDropIntent(null); intentRef.current = null;
  }, [activeWorkspaceId, clearSelection]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement) || !e.target.closest('[data-testid="sidebar-tree-scroll"]') || e.target.closest('input,textarea,select,[contenteditable="true"]') || dragRef.current) return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedRef.current.size) { e.preventDefault(); void bulkTrash([...selectedRef.current]); }
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [bulkTrash, clearSelection]);
  const coordinates: KeyboardCoordinateGetter = useCallback((event, { context, currentCoordinates }) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) return;
    event.preventDefault();
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      keyboardZone.current = event.code === "ArrowRight" ? "into" : "before";
      return { ...currentCoordinates, x: currentCoordinates.x + (event.code === "ArrowRight" ? 1 : -1) };
    }
    const targets = context.droppableContainers.getEnabled().filter(c => c.id.toString().startsWith("tree-") && c.id !== context.active?.id);
    const candidates = targets.map(c => ({ c, rect: context.droppableRects.get(c.id) })).filter(x => x.rect).sort((a,b) => a.rect!.top - b.rect!.top);
    const current = context.collisionRect;
    if (!current) return;
    const next = event.code === "ArrowDown" ? candidates.find(x => x.rect!.top > current.top + 1) : [...candidates].reverse().find(x => x.rect!.top < current.top - 1);
    if (next) { keyboardZone.current = event.code === "ArrowDown" ? "after" : "before"; return { x: currentCoordinates.x + next.rect!.left - current.left, y: currentCoordinates.y + next.rect!.top - current.top }; }
  }, []);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 7 } }), useSensor(KeyboardSensor, { coordinateGetter: coordinates }));
  const collisionDetection: CollisionDetection = useCallback(args => {
    const hits = args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
    // A pointer outside actual targets cancels instead of snapping to a distant folder/trash.
    return hits.sort((a,b) => {
      const priority = (id: string) => id === "sidebar-trash" ? 0 : id.startsWith("tree-") ? 1 : 2;
      return priority(String(a.id)) - priority(String(b.id));
    });
  }, []);
  const reset = useCallback(() => { dragRef.current = null; setActiveDrag(null); setDropIntent(null); intentRef.current = null; }, []);
  const onStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data?.documentId || movingRef.current) return;
    const ids = selectedRef.current.has(data.documentId) ? [...selectedRef.current] : [data.documentId];
    const roots = selectedTreeRoots(docs ?? [], ids);
    const next: ActiveDrag = { id: String(event.active.id), documentId: data.documentId, title: data.title, icon: data.icon, type: data.type, selectedIds: roots, count: roots.length };
    dragRef.current = next; setActiveDrag(next); keyboardZone.current = "into";
  }, [docs]);
  const onMove = useCallback((event: DragMoveEvent) => {
    const { over, activatorEvent, delta } = event;
    let next: DropIntent = null;
    if (over && String(over.id).startsWith("tree-") && dragRef.current) {
      const targetId = over.data.current?.documentId as string;
      const point = "touches" in activatorEvent ? (activatorEvent as TouchEvent).touches[0] : activatorEvent as MouseEvent;
      const y = point?.clientY;
      const ratio = typeof y === "number" ? (y + delta.y - over.rect.top) / over.rect.height : 0.5;
      const zone: TreeZone = activatorEvent instanceof KeyboardEvent ? keyboardZone.current : ratio < .25 ? "before" : ratio > .75 ? "after" : "into";
      try { planTreeMove(docs ?? [], { documentIds: dragRef.current.selectedIds, targetId, zone }); next = { targetId, zone }; } catch { /* invalid target has no misleading drop indicator */ }
    }
    if (next?.targetId !== intentRef.current?.targetId || next?.zone !== intentRef.current?.zone) { intentRef.current = next; setDropIntent(next); }
  }, [docs]);
  const onEnd = useCallback(async (event: DragEndEvent) => {
    const drag = dragRef.current, intent = intentRef.current;
    reset();
    if (!drag || !event.over || !activeWorkspaceId || movingRef.current) return;
    const over = String(event.over.id);
    if (over === "sidebar-trash") { void bulkTrash(drag.selectedIds); return; }
    const root = over === "sidebar-private-root" || over === "sidebar-root-area";
    if (!root && (!intent || intent.targetId !== event.over.data.current?.documentId)) return;
    const args = { documentIds: drag.selectedIds as Id<"flux_documents">[], targetId: root ? undefined : intent!.targetId as Id<"flux_documents">, zone: root ? "into" as const : intent!.zone };
    movingRef.current = true; setMoving(true);
    try {
      await moveMany.withOptimisticUpdate(store => {
        const query = { workspaceId: activeWorkspaceId }, list = store.getQuery(api.flux_documents.list, query);
        if (!list) return;
        const result = planTreeMove(list, args), patches = new Map(result.patches.map(p => [p._id, p]));
        store.setQuery(api.flux_documents.list, query, list.map(d => patches.has(d._id) ? { ...d, ...patches.get(d._id), _id: d._id } : d).sort(compareSortKeys) as typeof list);
      })(args);
      if (!root && intent?.zone === "into") window.dispatchEvent(new CustomEvent("bureau:tree-expand", { detail: { id: intent.targetId } }));
      clearSelection();
    } catch (error) { toast.error(error instanceof Error ? error.message : t("couldNotMove")); }
    finally { movingRef.current = false; setMoving(false); }
  }, [reset, activeWorkspaceId, bulkTrash, moveMany, clearSelection, t]);
  const value = useMemo(() => ({ trashingIds, activeDrag, dropIntent, selectedIds, moving, selectClick, clearSelection, registerVisibleOrder, registerScrollContainer, bulkTrash }), [trashingIds, activeDrag, dropIntent, selectedIds, moving, selectClick, clearSelection, registerVisibleOrder, registerScrollContainer, bulkTrash]);
  return <Context.Provider value={value}><DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onStart} onDragMove={onMove} onDragOver={onMove} onDragCancel={reset} onDragEnd={onEnd} autoScroll={{ threshold: { x: .1, y: .15 }, acceleration: 8 }}>
    {children}
    <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>{activeDrag && <div data-testid="tree-drag-overlay" className="flex max-w-64 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg"><span>{activeDrag.icon || <DocumentText size={16} />}</span><span className="truncate">{activeDrag.title}</span>{activeDrag.count > 1 && <span className="rounded-md bg-accent px-1.5 text-xs text-accent-foreground">{activeDrag.count}</span>}</div>}</DragOverlay>
  </DndContext></Context.Provider>;
}
