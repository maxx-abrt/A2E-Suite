"use client";

import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Add,
  ArrowRight2,
  DocumentText,
  Folder as FolderIcon,
  FolderOpen,
  More,
  Edit2,
  Copy,
  Star1,
  Link21,
  Trash,
} from "iconsax-reactjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspace } from "@/hooks/use-flux-workspace";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTrashDnd } from "@/components/providers/dnd-trash-provider";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useVirtualizer } from "@tanstack/react-virtual";
import { flattenTree } from "@/lib/document-tree-model";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Doc = {
  _id: Id<"flux_documents">;
  title: string;
  icon?: string;
  parentId?: Id<"flux_documents">;
  isFolder?: boolean;
  sortKey?: string;
  order?: number;
  createdAt?: number;
};

export type TreeSharedProps = {
  activeId?: string | null;
  favoriteIds?: Set<string>;
  /** §6 / M5.4: flux_documents ids with unread activity → coral NotifyMarker dot. */
  notifyDocIds?: Set<string>;
  openIds: Set<string>;
  onToggleOpen: (id: string, open: boolean) => void;
  activePathIds?: Set<string>;
  lastChildIds?: Set<string>;
};

// §14.8: virtualize past 200 visible rows (fixed 28px rows make this trivial).
const VIRTUALIZE_THRESHOLD = 200;
const ROW_HEIGHT = 36;

// ─────────────────────────────────────────────────────────────────────────────
// flattenVisibleTree — flat DFS-ordered list of visible rows.
//
// Single source of truth for the flat renderer, the virtualizer, and the
// sidebar's range-selection `visibleOrder`. Children are sorted by
// `compareSortKeys` (sortKey primary, order/createdAt fallback) to match the
// server `flux_documents.list` ordering.
// ─────────────────────────────────────────────────────────────────────────────
export function flattenVisibleTree(
  docs: Doc[],
  openIds: Set<string>,
): Array<{ doc: Doc; depth: number; hasChildren: boolean }> {
  return flattenTree(docs, openIds);
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentTree — flat (non-recursive) renderer with optional virtualization.
//
// Replaces the previous Radix-Accordion recursive renderer (M3.1–M3.6). The
// tree is flattened into a single list of rows; each row is a `DocumentTreeRow`
// that handles its own expand/collapse, drag/drop, selection, and editing.
// Past 200 visible rows, `@tanstack/react-virtual` virtualizes the list so
// rendering 500+ rows stays smooth. `useDeferredValue` on `docs` keeps typing
// elsewhere (search, command palette) responsive while the tree recomputes.
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentTree({
  docs,
  scrollContainerRef,
  onNavigate,
  onCreateChild,
  activeId,
  favoriteIds,
  notifyDocIds,
  openIds,
  onToggleOpen,
}: {
  docs: Doc[];
  /** Ref to the nearest scrollable ancestor (the sidebar tree scroll container).
   * Required for virtualization; ignored when ≤ VIRTUALIZE_THRESHOLD rows. */
  scrollContainerRef: RefObject<HTMLElement | null>;
  onNavigate: () => void;
  onCreateChild: (parentId?: Id<"flux_documents">) => void | Promise<void>;
} & TreeSharedProps) {
  // §14.8: useDeferredValue so typing elsewhere stays smooth.
  const deferredDocs = useDeferredValue(docs);

  const activePathIds = useMemo(() => {
    const path = new Set<string>(); const byId = new Map(docs.map(d => [String(d._id), d]));
    let id = activeId ?? undefined;
    while (id && !path.has(id)) { path.add(id); id = byId.get(id)?.parentId; }
    return path;
  }, [docs, activeId]);
  const lastChildIds = useMemo(() => {
    const last = new Map<string | undefined, string>();
    for (const row of flattenTree(docs, new Set(docs.map(d => String(d._id))))) last.set(row.doc.parentId, row.doc._id);
    return new Set(last.values());
  }, [docs]);
  const flatRows = useMemo(
    () => flattenVisibleTree(deferredDocs, openIds),
    [deferredDocs, openIds],
  );

  // Ref to the inner spacer div that holds the absolutely-positioned rows.
  // Used to measure `scrollMargin` — the height of non-virtualized content
  // above the tree inside the same scroll container (favorites, section header).
  const innerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const shouldVirtualize = flatRows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? flatRows.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin,
    enabled: shouldVirtualize,
  });

  // Measure scrollMargin whenever the layout above the tree might change.
  useLayoutEffect(() => {
    if (!shouldVirtualize) return;
    const measure = () => {
      const inner = innerRef.current;
      const scroller = scrollContainerRef.current;
      if (!inner || !scroller) return;
      const innerRect = inner.getBoundingClientRect();
      const scrollRect = scroller.getBoundingClientRect();
      setScrollMargin(innerRect.top - scrollRect.top + scroller.scrollTop);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (scrollContainerRef.current) ro.observe(scrollContainerRef.current);
    return () => ro.disconnect();
  }, [shouldVirtualize, scrollContainerRef, openIds]);

  if (flatRows.length === 0) return null;

  // ── Virtualized path (>200 visible rows) ──
  if (shouldVirtualize) {
    const items = virtualizer.getVirtualItems();
    return (
      <div
        ref={innerRef}
        data-testid="tree-virtualized" role="tree" aria-label="Documents"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {items.map((vi) => {
          const row = flatRows[vi.index];
          if (!row) return null;
          return (
            <div
              key={String(row.doc._id)}
              data-testid="tree-virtual-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${vi.size}px`,
                transform: `translateY(${vi.start - scrollMargin}px)`,
              }}
            >
              <DocumentTreeRow
                doc={row.doc}
                depth={row.depth}
                hasChildren={row.hasChildren}
                onNavigate={onNavigate}
                onCreateChild={onCreateChild}
                activeId={activeId}
                favoriteIds={favoriteIds}
                notifyDocIds={notifyDocIds}
                openIds={openIds}
                onToggleOpen={onToggleOpen}
                activePathIds={activePathIds} lastChildIds={lastChildIds}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Non-virtualized path (≤200 visible rows) ──
  return (
    <div className="flex flex-col" role="tree" aria-label="Documents" data-testid="tree-flat">
      {flatRows.map((row) => (
        <DocumentTreeRow
          key={String(row.doc._id)}
          doc={row.doc}
          depth={row.depth}
          hasChildren={row.hasChildren}
          onNavigate={onNavigate}
          onCreateChild={onCreateChild}
          activeId={activeId}
          favoriteIds={favoriteIds}
          notifyDocIds={notifyDocIds}
          openIds={openIds}
          onToggleOpen={onToggleOpen}
                activePathIds={activePathIds} lastChildIds={lastChildIds}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentTreeRow — a single flat tree row (28px, no Radix Accordion).
//
// Handles: expand/collapse (chevron click), drag/drop (dnd-kit), 3-zone drop
// indicators, indent rails, icon, label (Link + inline rename + favorite star),
// actions menu, multi-select, auto-expand on drop-hover, trashing animation.
//
// §14.8: React.memo with custom equality so a keystroke never re-renders 500
// rows — only rows whose identity-relevant props changed re-render.
// Context-driven re-renders (selection, dragging, trashing, drop intent) still
// propagate via useTrashDnd / useDraggable, which is correct.
// ─────────────────────────────────────────────────────────────────────────────
const DocumentTreeRow = memo(
  function DocumentTreeRow({
    doc,
    depth,
    hasChildren,
    onNavigate,
    onCreateChild,
    activeId,
    favoriteIds,
    notifyDocIds,
    openIds,
    onToggleOpen,
    activePathIds, lastChildIds,
  }: {
    doc: Doc;
    depth: number;
    hasChildren: boolean;
    onNavigate: () => void;
    onCreateChild: (parentId?: Id<"flux_documents">) => void | Promise<void>;
  } & TreeSharedProps) {
    const isFolderNode = doc.isFolder ?? false;
    const isOpen = openIds.has(String(doc._id));
    const isActive = activeId === String(doc._id);
    const isFavorite = favoriteIds?.has(String(doc._id)) ?? false;
    // §6 / M5.4: coral NotifyMarker dot for docs with unread activity.
    const hasUnread = notifyDocIds?.has(String(doc._id)) ?? false;
    const router = useRouter();
    const { activeWorkspaceId } = useWorkspace();
    const t = useTranslations("tree");
    const tc = useTranslations("common");
    const createDoc = useMutation(api.flux_documents.create);
    const createFolder = useMutation(api.flux_documents.createFolder);
    const update = useMutation(api.flux_documents.update);
    const duplicateFn = useMutation(api.flux_documents.duplicate);
    const toggleFavorite = useMutation(api.flux_documents.toggleFavorite);
    const archive = useMutation(api.flux_documents.archive);
    const {
      trashingIds,
      dropIntent,
      selectedIds,
      selectClick,
      activeDrag,
      bulkTrash, moving,
    } = useTrashDnd();
    const isSelected = selectedIds.has(String(doc._id));

    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(doc.title);
    const inputRef = useRef<HTMLInputElement>(null);
    const renaming = useRef(false);

    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `tree-${doc._id}`,
      data: {
        documentId: doc._id,
        isFolder: isFolderNode,
        title: doc.title,
        icon: doc.icon,
        type: "tree",
      },
      disabled: editing || moving,
    });

    // §14.1: any document can contain children — no special gate.
    // §14.3 / M3.6: `isOver` drives the 600ms auto-expand timer.
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `tree-${doc._id}`,
      data: { documentId: doc._id, isFolder: isFolderNode },
    });

    const isTrashing = trashingIds.has(doc._id);

    const setRefs = (el: HTMLDivElement | null) => {
      setDragRef(el as any);
      setDropRef(el as any);
    };

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();

    const addChild = async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!activeWorkspaceId) return;
      const id = await createDoc({
        workspaceId: activeWorkspaceId,
        title: "Untitled",
        parentId: doc._id as Id<"flux_documents">,
      });
      onToggleOpen(String(doc._id), true);
      router.push(`/app/documents/${id}`);
    };

    const addFolder = async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!activeWorkspaceId) return;
      await createFolder({
        workspaceId: activeWorkspaceId,
        parentId: doc._id as Id<"flux_documents">,
      });
      onToggleOpen(String(doc._id), true);
    };

    const startRename = () => {
      setDraft(doc.title);
      renaming.current = true;
      setEditing(true);
      setMenuOpen(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };

    const commitRename = async () => {
      if (!renaming.current) return;
      renaming.current = false;
      setEditing(false);
      const next = draft.trim();
      if (next && next !== doc.title) {
        try {
          await update({ documentId: doc._id, title: next });
        } catch {
          toast.error(tc("createFailed"));
        }
      }
    };

    const onDuplicate = async () => {
      try {
        const newId = await duplicateFn({ documentId: doc._id });
        toast.success(t("duplicated"));
        router.push(`/app/documents/${newId}`);
      } catch {
        toast.error(tc("createFailed"));
      }
    };

    const onCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/app/documents/${doc._id}`,
        );
        toast.success(t("linkCopied"));
      } catch {
        /* clipboard denied */
      }
    };

    const onTrash = async () => {
      // §14.3: multi-selection → bulk trash with single Undo toast.
      if (isSelected && selectedIds.size > 1) {
        bulkTrash(Array.from(selectedIds));
        if (isActive) router.push("/app/documents");
        return;
      }
      try {
        await archive({ documentId: doc._id });
        toast.success(t("trashed"));
        if (isActive) router.push("/app/documents");
      } catch {
        toast.error(tc("createFailed"));
      }
    };

    const dragStyle = undefined;

    const canExpand = isFolderNode || hasChildren;

    // §14.3 / M3.6: auto-expand on drop-hover (600ms timer for collapsed
    // expandable nodes). `onToggleOpen` read through a ref so the timer is
    // not reset on every parent re-render.
    const onToggleOpenRef = useRef(onToggleOpen);
    onToggleOpenRef.current = onToggleOpen;
    useEffect(() => {
      if (!isOver || !activeDrag || !canExpand || isOpen || dropIntent?.targetId !== doc._id || dropIntent.zone !== "into") return;
      const id = String(doc._id);
      const timer = setTimeout(() => onToggleOpenRef.current(id, true), 600);
      return () => clearTimeout(timer);
    }, [isOver, activeDrag, canExpand, isOpen, doc._id, dropIntent]);

    // §14.1: 3-zone drop intent (before/into/after) from provider-side pointer Y.
    const showBefore = dropIntent?.targetId === doc._id && dropIntent.zone === "before";
    const showAfter = dropIntent?.targetId === doc._id && dropIntent.zone === "after";
    const showInto = dropIntent?.targetId === doc._id && dropIntent.zone === "into";

    // §14.3: vertical indent rails — one per depth level.
    const renderIndentRails = () => {
      if (!depth) return null;
      return Array.from({ length: Math.min(depth, 10) }, (_, i) => {
        const elbow = i === Math.min(depth, 10) - 1;
        return <svg key={i} aria-hidden="true" width="16" height="36" viewBox="0 0 16 36" fill="none" className={cn("pointer-events-none absolute top-0 text-border", elbow && activePathIds?.has(doc._id) && "text-primary")} style={{ left: i * 16 + 12 }}>
          <path d={elbow ? `M.5 0 V12 Q.5 18 6.5 18 H15.5${lastChildIds?.has(doc._id) ? "" : " M.5 12 V36"}` : "M.5 0 V36"} stroke="currentColor" strokeWidth={elbow && activePathIds?.has(doc._id) ? 1.5 : 1} strokeLinecap="round" />
        </svg>;
      });
    };

    const renderDropIndicators = () => (
      <>
        {showBefore && (
          <span
            aria-hidden="true"
            data-testid="tree-drop-before"
            className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-primary"
          />
        )}
        {showAfter && (
          <span
            aria-hidden="true"
            data-testid="tree-drop-after"
            className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary"
          />
        )}
      </>
    );

    const renderIcon = () => {
      if (doc.icon) {
        return <span className="shrink-0 text-[13px]">{doc.icon}</span>;
      }
      if (isFolderNode) {
        return isOpen ? (
          <FolderOpen variant="Bulk" size={16} className="shrink-0 text-primary/80" />
        ) : (
          <FolderIcon variant="Bulk" size={16} className="shrink-0 text-primary/70" />
        );
      }
      return (
        <DocumentText variant="Bulk" size={15} className="shrink-0 text-muted-foreground" />
      );
    };

    const renderLabel = () => {
      if (editing) {
        return (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={stop}
            onClick={stop}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { renaming.current = false; setEditing(false); }
            }}
            onBlur={commitRename}
            className="my-0.5 min-w-0 flex-1 rounded-md border border-primary/50 bg-background px-1.5 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            data-testid="tree-rename-input"
          />
        );
      }
      return (
        <>
          <Link
            href={`/app/documents/${doc._id}`}
            onClick={(e) => {
              // §14.3: ⌘/ctrl toggles, ⇧ range-selects. Modifier clicks must
              // not navigate or toggle expand.
              if (e.metaKey || e.ctrlKey || e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                selectClick(String(doc._id), e);
                return;
              }
              selectClick(String(doc._id), e);
              onNavigate();
            }}
            data-testid="doc-tree-item"
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 truncate"
          >
            <span className={cn("truncate", isFolderNode && "font-medium")}>
              {doc.title || tc("untitled")}
            </span>
          </Link>
          {hasUnread && (
            <span
              aria-label={t("unreadActivity")}
              title={t("unreadActivity")}
              data-testid="tree-notify-marker"
              className="ml-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary align-middle"
            />
          )}
          {isFavorite && (
            <Star1 variant="Bold" size={11} className="shrink-0 text-primary/70" />
          )}
        </>
      );
    };

    const renderActions = () => (
      <div
        className={cn(
          "flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
          menuOpen && "md:opacity-100",
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onPointerDown={stop}
              onClick={stop}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              title={t("actions")}
              data-testid="tree-more"
            >
              <More variant="Bulk" size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="right"
            className="w-52"
            onPointerDown={stop}
            onClick={stop}
          >
            <DropdownMenuItem
              onClick={startRename}
              className="gap-2"
              data-testid="tree-action-rename"
            >
              <Edit2 variant="Bulk" size={15} /> {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toggleFavorite({ documentId: doc._id }).catch(() => toast.error(tc("createFailed")))}
              className="gap-2"
              data-testid="tree-action-favorite"
            >
              <Star1
                variant={isFavorite ? "Bold" : "Bulk"}
                size={15}
                className={isFavorite ? "text-primary" : undefined}
              />
              {isFavorite ? t("favoriteRemove") : t("favoriteAdd")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDuplicate}
              className="gap-2"
              data-testid="tree-action-duplicate"
            >
              <Copy variant="Bulk" size={15} /> {t("duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCopyLink}
              className="gap-2"
              data-testid="tree-action-copylink"
            >
              <Link21 variant="Bulk" size={15} /> {t("copyLink")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => addChild().catch(() => toast.error(tc("createFailed")))}
              className="gap-2"
              data-testid="tree-action-newpage"
            >
              <Add variant="Bulk" size={15} /> {t("newPage")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => addFolder().catch(() => toast.error(tc("createFailed")))}
              className="gap-2"
              data-testid="tree-action-newfolder"
            >
              <FolderIcon variant="Bulk" size={15} /> {t("newFolder")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onTrash}
              className="gap-2 text-destructive"
              data-testid="tree-action-trash"
            >
              <Trash variant="Bulk" size={15} /> {t("trash")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    );

    const handleChevronClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleOpen(String(doc._id), !isOpen);
    };

    return (
      <div
        ref={setRefs}
        {...attributes}
        {...listeners}
        role="treeitem" aria-level={depth + 1} aria-selected={isSelected || isActive}
        data-document-id={doc._id}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") { e.preventDefault(); onToggleOpen(String(doc._id), true); }
          else if (e.key === "ArrowLeft") { e.preventDefault(); onToggleOpen(String(doc._id), false); }
          else if (e.key === "Enter") { e.preventDefault(); router.push(`/app/documents/${doc._id}`); onNavigate(); }
          else if (e.key === "F2") { e.preventDefault(); startRename(); }
          else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const rows = Array.from(e.currentTarget.closest('[role="tree"]')?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []); rows[rows.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)]?.focus(); }
          else listeners?.onKeyDown?.(e);
        }}
        aria-expanded={canExpand ? isOpen : undefined}
        style={{
          paddingLeft: Math.min(depth, 10) * 16 + 8,
          ...(isDragging ? { opacity: 0.3 } : {}),
          ...(!isDragging &&
            activeDrag?.selectedIds?.includes(String(doc._id)) && { opacity: 0.3 }),
          ...(isTrashing
            ? {
                pointerEvents: "none" as const,
                transform: "scale(0.8) translateY(8px)",
                opacity: 0,
                transition: "all 350ms cubic-bezier(0.36, 0, 0.66, -0.56)",
              }
            : {}),
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        className={cn(
          "tx-tree-row group relative flex h-9 w-full items-center gap-1.5 rounded-md pr-1 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
          "hover:bg-sidebar-accent",
          isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
          // §14.3: selected rows get a soft primary wash.
          isSelected && "bg-primary/10",
          showInto && "bg-primary/10 ring-2 ring-primary/50",
        )}
        data-testid="doc-tree-row"
      >
        {isActive && (
          <span className="pointer-events-none absolute inset-y-1 left-0 w-0.75 rounded-full bg-primary" />
        )}
        {renderIndentRails()}
        {renderDropIndicators()}
        {/* Chevron — only when the row can expand (has children or is folder). */}
        {canExpand ? (
          <button
            onClick={handleChevronClick}
            onPointerDown={stop}
            aria-label={isOpen ? t("collapse") : t("expand")}
            className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            data-testid="tree-chevron"
          >
            <ArrowRight2
              variant="Bulk"
              size={13}
              className={cn(
                "tx-tree-chevron transition-transform duration-200",
                isOpen && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="flex h-4 w-4 shrink-0" />
        )}
        {renderIcon()}
        {renderLabel()}
        {renderActions()}
      </div>
    );
  },
  // §14.8: custom equality — only re-render when identity-relevant props
  // (derivable from raw props) change. Context-driven values (selection,
  // dragging, trashing, drop intent) propagate via React context regardless.
  (prev, next) => {
    const prevId = String(prev.doc._id);
    const nextId = String(next.doc._id);
    if (prevId !== nextId || prev.activePathIds !== next.activePathIds || prev.lastChildIds !== next.lastChildIds || prev.onToggleOpen !== next.onToggleOpen) return false;
    if (prev.doc.title !== next.doc.title) return false;
    if (prev.doc.icon !== next.doc.icon) return false;
    if (prev.doc.isFolder !== next.doc.isFolder) return false;
    if (prev.depth !== next.depth) return false;
    if (prev.hasChildren !== next.hasChildren) return false;
    if (prev.openIds.has(prevId) !== next.openIds.has(nextId)) return false;
    if (prev.activeId !== next.activeId) return false;
    const prevFav = prev.favoriteIds?.has(prevId) ?? false;
    const nextFav = next.favoriteIds?.has(nextId) ?? false;
    if (prevFav !== nextFav) return false;
    // §6 / M5.4: re-render when this row's unread marker toggles.
    const prevUnread = prev.notifyDocIds?.has(prevId) ?? false;
    const nextUnread = next.notifyDocIds?.has(nextId) ?? false;
    if (prevUnread !== nextUnread) return false;
    return true;
  },
);

DocumentTreeRow.displayName = "DocumentTreeRow";
