from pathlib import Path
import re,json
root=Path('/app/Texxel/apps/web')
def edit(path, fn):
 p=root/path; p.write_text(fn(p.read_text()))
def replace(s,a,b):
 assert a in s, a[:90]
 return s.replace(a,b)
# Atomic server-side move with common validation, preserving existing API.
def server(s):
 s=s.replace('import { query, mutation, internalMutation }','import { query, mutation, internalMutation, type MutationCtx }')
 s='import { planTreeMove } from "../lib/document-tree-model";\nimport { compareSortKeys } from "../lib/sort-key";\n'+s
 a=s.index('function compareDocs('); b=s.index('\n/** All non-archived',a)
 s=s[:a]+'const compareDocs = compareSortKeys;\n'+s[b:]
 helpers='''async function validateParent(ctx: MutationCtx, parentId: Id<"flux_documents"> | undefined, workspaceId: Id<"workspaces">, userId: Id<"users">, sourceId?: Id<"flux_documents">) {
  const seen = new Set<string>();
  let cursor = parentId;
  while (cursor) {
    if (cursor === sourceId || seen.has(cursor)) throw new Error("Cannot create a circular document hierarchy");
    seen.add(cursor);
    const parent = await ctx.db.get(cursor);
    if (!parent || parent.isArchived) throw new Error("Destination is no longer available");
    if (parent.workspaceId !== workspaceId || !canAccessDoc(parent, userId)) throw new Error("No access to destination");
    cursor = parent.parentId;
  }
}
export const moveMany = mutation({
  args: { documentIds: v.array(v.id("flux_documents")), targetId: v.optional(v.id("flux_documents")), zone: v.union(v.literal("before"), v.literal("into"), v.literal("after")) },
  handler: async (ctx, args) => {
    const first = await ctx.db.get(args.documentIds[0]);
    if (!first) throw new Error("Document not found");
    const { userId } = await assertWorkspaceMember(ctx, first.workspaceId, "member");
    const docs = await ctx.db.query("flux_documents").withIndex("by_workspace", q => q.eq("workspaceId", first.workspaceId)).collect();
    const plan = planTreeMove(docs, args);
    for (const id of [...args.documentIds, ...(args.targetId ? [args.targetId] : []), ...plan.patches.map(p => p._id)]) {
      const doc = docs.find(d => d._id === id);
      if (!doc || !canAccessDoc(doc, userId)) throw new Error("No access to document");
    }
    await validateParent(ctx, plan.parentId as Id<"flux_documents"> | undefined, first.workspaceId, userId);
    for (const patch of plan.patches) await ctx.db.patch(patch._id as Id<"flux_documents">, { parentId: patch.parentId as Id<"flux_documents"> | undefined, sortKey: patch.sortKey, updatedAt: Date.now() });
    return plan.movedIds;
  },
});

'''
 s=s.replace('export const move = mutation({',helpers+'export const move = mutation({')
 pattern=r'    if \(args.parentId !== undefined\) \{\n      if \(args.parentId === args.documentId\).*?\n    \}'
 s=re.sub(pattern,'    await validateParent(ctx, args.parentId, doc.workspaceId, userId, args.documentId);',s,flags=re.S)
 s=s.replace('    const now = Date.now();\n    const id = await ctx.db.insert("flux_documents", {\n      workspaceId: args.workspaceId,','    await validateParent(ctx, args.parentId, args.workspaceId, userId);\n    const now = Date.now();\n    const id = await ctx.db.insert("flux_documents", {\n      workspaceId: args.workspaceId,')
 s=s.replace('    passphraseHint: v.optional(v.string()),\n  },\n  handler:', '    passphraseHint: v.optional(v.string()),\n    content: v.optional(v.string()),\n  },\n  handler:')
 s=s.replace('      isLocked: args.isLocked,','      ...(args.content !== undefined ? { content: args.content } : {}),\n      isLocked: args.isLocked,')
 s=s.replace('    while (queue.length) {\n      const current = queue.shift()!;', '    const visited = new Set<string>();\n    while (queue.length) {\n      const current = queue.shift()!;\n      if (visited.has(current)) continue;\n      visited.add(current);')
 return s
edit('convex/flux_documents.ts',server)
# Tree's flat representation remains virtualizable; visual branches follow the supplied reference.
def tree(s):
 s=s.replace('import { compareSortKeys } from "@/lib/sort-key";', 'import { flattenTree } from "@/lib/document-tree-model";')
 a=s.index('  const byParent = ',s.index('export function flattenVisibleTree')); b=s.index('\n}\n',a)
 s=s[:a]+'  return flattenTree(docs, openIds);'+s[b:]
 s=s.replace('const ROW_HEIGHT = 28;', 'const ROW_HEIGHT = 36;')
 s=s.replace('  onToggleOpen: (id: string, open: boolean) => void;', '  onToggleOpen: (id: string, open: boolean) => void;\n  activePathIds?: Set<string>;\n  lastChildIds?: Set<string>;')
 needle='  const flatRows = useMemo('
 pos=s.index(needle)
 s=s[:pos]+'''  const activePathIds = useMemo(() => {
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
'''+s[pos:]
 s=s.replace('onToggleOpen={onToggleOpen}', 'onToggleOpen={onToggleOpen}\n                activePathIds={activePathIds} lastChildIds={lastChildIds}')
 s=s.replace('    onToggleOpen,\n  }: {', '    onToggleOpen,\n    activePathIds, lastChildIds,\n  }: {')
 s=s.replace('                transform: `translateY(${vi.start}px)`','                transform: `translateY(${vi.start - scrollMargin}px)`')
 s=s.replace('className="flex flex-col gap-0.5" data-testid="tree-flat"','className="flex flex-col" role="tree" aria-label="Documents" data-testid="tree-flat"')
 s=s.replace('        data-testid="tree-virtualized"','        data-testid="tree-virtualized" role="tree" aria-label="Documents"')
 s=s.replace('      bulkTrash,','      bulkTrash, moving,')
 s=s.replace('disabled: editing,','disabled: editing || moving,')
 s=s.replace('    const dragStyle = transform\n      ? { transform: CSS.Translate.toString(transform) }\n      : undefined;', '    const dragStyle = undefined;')
 s=s.replace('if (!isOver || !activeDrag || !canExpand || isOpen) return;', 'if (!isOver || !activeDrag || !canExpand || isOpen || dropIntent?.targetId !== doc._id || dropIntent.zone !== "into") return;')
 s=s.replace('[isOver, activeDrag, canExpand, isOpen, doc._id]);','[isOver, activeDrag, canExpand, isOpen, doc._id, dropIntent]);')
 a=s.index('    const renderIndentRails ='); b=s.index('\n    const renderDropIndicators',a)
 s=s[:a]+'''    const renderIndentRails = () => {
      if (!depth) return null;
      return Array.from({ length: Math.min(depth, 10) }, (_, i) => {
        const elbow = i === Math.min(depth, 10) - 1;
        return <svg key={i} aria-hidden="true" width="16" height="36" viewBox="0 0 16 36" fill="none" className={cn("pointer-events-none absolute top-0 text-border", elbow && activePathIds?.has(doc._id) && "text-primary")} style={{ left: i * 16 + 12 }}>
          <path d={elbow ? `M.5 0 V12 Q.5 18 6.5 18 H15.5${lastChildIds?.has(doc._id) ? "" : " M.5 12 V36"}` : "M.5 0 V36"} stroke="currentColor" strokeWidth={elbow && activePathIds?.has(doc._id) ? 1.5 : 1} strokeLinecap="round" />
        </svg>;
      });
    };
'''+s[b:]
 s=s.replace('"hidden items-center gap-0.5 group-hover:flex",','"flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",')
 s=s.replace('menuOpen && "flex",','menuOpen && "md:opacity-100",')
 s=s.replace('className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-border"','className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"')
 # Remove duplicate row create button; stays in contextual menu.
 a=s.index('        <button\n          onClick={addChild}'); b=s.index('        </button>',a)+len('        </button>'); s=s[:a]+s[b:]
 s=s.replace('      onNavigate();','      selectClick(String(doc._id), e);\n              onNavigate();')
 s=s.replace('        {...attributes}\n        {...listeners}', '        {...attributes}\n        {...listeners}\n        role="treeitem" aria-level={depth + 1} aria-selected={isSelected || isActive}\n        data-document-id={doc._id}\n        onKeyDown={(e) => {\n          if (e.target !== e.currentTarget) return;\n          if (e.key === "ArrowRight") { e.preventDefault(); onToggleOpen(String(doc._id), true); }\n          else if (e.key === "ArrowLeft") { e.preventDefault(); onToggleOpen(String(doc._id), false); }\n          else if (e.key === "Enter") { e.preventDefault(); router.push(`/app/documents/${doc._id}`); onNavigate(); }\n          else if (e.key === "F2") { e.preventDefault(); startRename(); }\n          else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const rows = Array.from(e.currentTarget.closest(\'[role="tree"]\')?.querySelectorAll<HTMLElement>(\'[role="treeitem"]\') ?? []); rows[rows.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)]?.focus(); }\n          else listeners?.onKeyDown?.(e);\n        }}')
 s=s.replace('          ...dragStyle,', '          paddingLeft: Math.min(depth, 10) * 16 + 8,')
 s=s.replace('"tx-tree-row group relative flex h-7 w-full items-center gap-1 rounded-lg pr-1 text-[13.5px] transition-colors duration-150",', '"tx-tree-row group relative flex h-9 w-full items-center gap-1.5 rounded-md pr-1 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",')
 s=s.replace('className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground"','className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"')
 s=s.replace('    if (prevId !== nextId) return false;', '    if (prevId !== nextId || prev.activePathIds !== next.activePathIds || prev.lastChildIds !== next.lastChildIds || prev.onToggleOpen !== next.onToggleOpen) return false;')
 # Do not save twice on Enter then blur, or save on Escape.
 s=s.replace('    const inputRef = useRef<HTMLInputElement>(null);', '    const inputRef = useRef<HTMLInputElement>(null);\n    const renaming = useRef(false);')
 s=s.replace('      setDraft(doc.title);\n      setEditing(true);', '      setDraft(doc.title);\n      renaming.current = true;\n      setEditing(true);')
 s=s.replace('    const commitRename = async () => {\n      setEditing(false);', '    const commitRename = async () => {\n      if (!renaming.current) return;\n      renaming.current = false;\n      setEditing(false);')
 s=s.replace('if (e.key === "Escape") setEditing(false);','if (e.key === "Escape") { renaming.current = false; setEditing(false); }')
 s=s.replace('onClick={() => toggleFavorite({ documentId: doc._id })}', 'onClick={() => toggleFavorite({ documentId: doc._id }).catch(() => toast.error(tc("createFailed")))}')
 s=s.replace('onClick={() => addChild()}', 'onClick={() => addChild().catch(() => toast.error(tc("createFailed")))}').replace('onClick={() => addFolder()}', 'onClick={() => addFolder().catch(() => toast.error(tc("createFailed")))}')
 return s
edit('components/app/document-tree.tsx',tree)
def sidebar(s):
 s=s.replace('  const t = useTranslations("nav");','  const t = useTranslations("nav");\n  const tx = useTranslations("editorTools");\n  const [treeOnly, setTreeOnly] = usePersistedState<boolean>("bureau-sidebar-tree-only", false);')
 s=s.replace('data-collapsed={collapsed || undefined}', 'data-collapsed={collapsed || undefined}\n        data-mode={treeOnly ? "tree" : "full"}')
 s=s.replace('"fixed inset-y-0 left-0 z-50 flex w-[280px]', '"fixed inset-y-0 left-0 z-50 flex w-[min(320px,90vw)]')
 s=s.replace('      {mobileOpen && (\n        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />\n      )}', '      {mobileOpen && (\n        <button type="button" aria-label={tx("close")} data-testid="sidebar-backdrop" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />\n      )}')
 s=s.replace('className="md:hidden" onClick={onClose}', 'className="md:hidden" aria-label={tx("close")} data-testid="sidebar-mobile-close" onClick={onClose}')
 s=s.replace('className="flex min-h-0 flex-1 flex-col"', 'className="flex min-h-0 flex-1 flex-col"')
 s=s.replace('bg-background/60 px-3 py-2','bg-background px-3 py-2')
 s=s.replace('        <nav className="mt-3 space-y-0.5 px-3">', '''        <div className="mx-3 mt-3 flex items-center rounded-lg border border-sidebar-border bg-sidebar p-0.5" role="group" aria-label={tx("navigationMode")}>
          <button type="button" data-testid="sidebar-mode-full" aria-pressed={!treeOnly} onClick={() => setTreeOnly(false)} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs transition-colors", !treeOnly ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}>{tx("workspace")}</button>
          <button type="button" data-testid="sidebar-mode-tree" aria-pressed={treeOnly} onClick={() => setTreeOnly(true)} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs transition-colors", treeOnly ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}>{tx("pagesOnly")}</button>
        </div>
        {!treeOnly && <nav className="mt-2 max-h-[34vh] shrink-0 space-y-0.5 overflow-y-auto px-3">''')
 s=s.replace('        </nav>','        </nav>}')
 s=s.replace('rounded-xl px-3 py-2 text-sm transition-colors','rounded-md px-3 py-1.5 text-[13px] transition-colors')
 s=s.replace('{favorites && favorites.length > 0 && (','{!treeOnly && favorites && favorites.length > 0 && (')
 s=s.replace('"flex items-center justify-between rounded-lg px-3 py-1 transition-colors",','"sticky top-0 z-10 flex items-center justify-between rounded-lg bg-sidebar px-2 py-2 transition-colors",')
 s=s.replace('<span>{t("private")}</span>','<span>{tx("pages")}</span>')
 s=s.replace('            <div className="flex items-center">','            <div className="flex items-center gap-1">\n              <button type="button" data-testid="tree-collapse-all" onClick={() => setOpenList([])} className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent" title={tx("collapseAll")} aria-label={tx("collapseAll")}><ArrowDown2 size={14} className="rotate-180" /></button>')
 s=s.replace('                activeDrag && "border border-dashed border-primary/30 p-0.5",','                activeDrag && "outline outline-1 outline-dashed outline-primary/30",')
 s=s.replace('              <DocumentTree','              {docs === undefined && <div role="status" aria-label={tx("loadingPages")} data-testid="tree-loading" className="space-y-3 p-3">{[0,1,2,3].map(i => <div key={i} className="h-5 animate-pulse rounded bg-muted" style={{ width: `${85-i*12}%` }} />)}</div>}\n              <DocumentTree')
 s=s.replace('<button onClick={() => onCreate()} className="mt-1','<button data-testid="tree-empty-create" onClick={() => onCreate()} className="mt-1')
 s=s.replace('"relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm','"relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px]')
 s=s.replace('onClick={() => router.push("/app/settings?new=1")}','data-testid="sidebar-create-workspace" onClick={() => router.push("/app/settings?new=1")}')
 s=s.replace('href="/app/trash"\n', 'href="/app/trash" data-testid="sidebar-trash-link"\n').replace('href="/app/settings" onClick=', 'href="/app/settings" data-testid="sidebar-settings-link" onClick=')
 return s
edit('components/app/sidebar.tsx',sidebar)
# Editor integration: one compact tools row; slash menu keeps all advanced inserts discoverable.
def editor(s):
 a=s.index('const Mention = '); b=s.index('const INLINE_SYSTEM_FONTS',a)
 s=s[:a]+s[b:]
 s=s.replace('import { suggestionMenuFloatingUIOptions }', 'import { fluxEditorSchema } from "@/lib/editor-schema";\nexport { fluxEditorSchema } from "@/lib/editor-schema";\nimport { ReviewExtension, attachReview, restoreReview, serializeEditor } from "@/lib/editor-review";\nimport { EditorTools } from "./editor-tools";\nimport { getMathSlashMenuItems, locales as mathLocales } from "@blocknote/math-block";\nimport { getDiagramSlashMenuItems, locales as diagramLocales } from "@blocknote/diagram-block";\nimport { multiColumnDropCursor, getMultiColumnSlashMenuItems, locales as columnLocales } from "@blocknote/xl-multi-column";\nimport { emptyDatabase } from "@/lib/editor-database";\nimport { suggestionMenuFloatingUIOptions }')
 s=s.replace('import "@blocknote/mantine/style.css";', 'import "@blocknote/mantine/style.css";\nimport "./editor-workspace.css";')
 s=s.replace('  const dictionary = (locales as any)[locale] ?? (locales as any).en;', '  const dictionary = { ...((locales as any)[locale] ?? locales.en), math: (mathLocales as any)[locale] ?? mathLocales.en, diagram: (diagramLocales as any)[locale] ?? diagramLocales.en, multi_column: (columnLocales as any)[locale] ?? columnLocales.en };\n  const tx = useTranslations("editorTools");\n  const [reviewError, setReviewError] = useState(false);')
 s=s.replace('    dictionary,\n    extensions: threadStore ? [CommentsExtension({ threadStore, resolveUsers })] : [],', '    dictionary,\n    dropCursor: multiColumnDropCursor,\n    extensions: [ReviewExtension, ...(threadStore ? [CommentsExtension({ threadStore, resolveUsers })] : [])],')
 s=s.replace('  // ── OS file drop → core drive attachment (§14.6) ────────────────────────\n  // Intercepts', '''  useEffect(() => {
    try { restoreReview(editor, initialContent); } catch { setReviewError(true); }
    const detach = attachReview(editor, () => toast.info(tx("textReviewOnly"), { id: "review-text-only" }));
    return () => { detach(); if (anchorTimer.current) clearTimeout(anchorTimer.current); };
  }, [editor]);

  // ── OS file drop → core drive attachment (§14.6) ────────────────────────
  // Intercepts''')
 s=s.replace('onChange?.(JSON.stringify(editor.document));','if (!reviewError) onChange?.(serializeEditor(editor));')
 s=s.replace('editable={editable}\n', 'editable={editable && !reviewError}\n')
 s=s.replace('      <BlockNoteView\n', '      {reviewError && <div role="alert" className="mb-3 rounded-lg border border-destructive bg-card p-3 text-sm">{tx("reviewLoadError")}</div>}\n      {editable && !reviewError && <EditorTools editor={editor} />}\n      <BlockNoteView\n')
 s=s.replace('              const all = [...defaults, ...chartItems];', '''              const databaseItem = { title: tx("database"), group: tx("advanced"), aliases: ["database", "collection", "base", "table"], onItemClick: () => editor.insertBlocks([{ type: "database", props: { data: JSON.stringify(emptyDatabase(crypto.randomUUID(), userId ?? "guest", tx("database"), tx("name"))) } }], editor.getTextCursorPosition().block, "after") };
              const all = [...defaults, ...getMultiColumnSlashMenuItems(editor), ...getMathSlashMenuItems(editor), ...getDiagramSlashMenuItems(editor), databaseItem, ...chartItems];''')
 s=s.replace('      else if (dropped.length > 0) toast.error(tEditor("dropFailed"));','      if (inserted < dropped.length) toast.error(tEditor("dropFailed"));')
 return s
edit('components/app/flux-editor.tsx',editor)
# Remove only the broken obsolete code; fix active type errors.
edit('app/app/documents/page.tsx',lambda s:s.replace('<Upload variant="Bulk"','<Upload'))
edit('components/app/template-picker-dialog.tsx',lambda s:s.replace('<Upload variant="Bulk"','<Upload'))
edit('app/app/settings/page.tsx',lambda s:s.replace('{ name: activeWorkspace?.name }','{ name: activeWorkspace?.name ?? "" }'))
# Compact document chrome, secondary actions move into the existing menu.
def chrome(s):
 for key in ['star','lock']:
  a=s.index('          {showTool("'+key+'") && ('); b=s.index('\n          )}',a)+len('\n          )}')
  s=s[:a]+s[b:]
 needle='            <DropdownMenuContent align="end" className="w-60">'
 s=s.replace(needle,needle+'''
              <DropdownMenuItem data-testid="doc-favorite" onClick={() => toggleFavorite({ documentId }).catch(() => toast.error(te("createFailed")))} className="gap-2"><Star1 size={16} />{isFavorite ? te("tooltipFavoriteRemove") : te("tooltipFavoriteAdd")}</DropdownMenuItem>
              <DropdownMenuItem data-testid="doc-lock-btn" onClick={() => { setPassphraseInput(""); setPassphraseHintInput(doc.passphraseHint ?? ""); setLockError(""); setLockDialogOpen(true); }} className="gap-2"><Lock1 size={16} />{doc.isLocked ? te("tooltipLocked") : te("tooltipLock")}</DropdownMenuItem>
              <DropdownMenuSeparator />''')
 a=s.index('              <DropdownMenuSub>\n',s.index(needle)); b=s.index('              </DropdownMenuSub>',a)+len('              </DropdownMenuSub>');s=s[:a]+s[b:]
 s=s.replace('data-testid="doc-export-open"', 'data-testid="doc-export-open" aria-label={tDocs("export.open")}')
 s=s.replace('            <DocumentDownload variant="Bulk" size={15} /> {tDocs("export.open")}','            <DocumentDownload variant="Bulk" size={15} /><span className="hidden lg:inline">{tDocs("export.open")}</span>')
 s=s.replace('              <DropdownMenuItem onClick={() => fileRef.current?.click()}','              <DropdownMenuItem data-testid="doc-cover-change" onClick={() => fileRef.current?.click()}')
 return s
edit('components/app/document-view.tsx',chrome)
# All added UI copy is bilingual.
copy={
'en': {'workspace':'Workspace','pagesOnly':'Pages only','pages':'Pages','navigationMode':'Navigation mode','collapseAll':'Collapse all','loadingPages':'Loading pages','close':'Close','loadingDatabase':'Loading database…','databaseError':'Unable to load this database. Your saved data has not been changed.','database':'Database','advanced':'Advanced blocks','name':'Name','reviewLoadError':'Review data could not be restored. Editing is disabled to protect your document.','textReviewOnly':'Switch to Editing to change formatting or structure. Suggestions track text edits.','editing':'Editing','suggesting':'Suggesting','review':'Review edits','acceptAll':'Accept all','rejectAll':'Reject all','pending':'{count} pending','undo':'Undo','redo':'Redo','insertHint':'Type / to insert a block','savedError':'Not saved','retry':'Retry','odtDescription':'Editable OpenDocument','odtFont':'ODT uses the fonts available in your document reader.','reviewExport':'Accept or reject pending suggestions before exporting.','odtLayout':'ODT uses the exporter’s standard page layout.'},
'fr': {'workspace':'Espace','pagesOnly':'Pages seules','pages':'Pages','navigationMode':'Mode de navigation','collapseAll':'Tout replier','loadingPages':'Chargement des pages','close':'Fermer','loadingDatabase':'Chargement de la base…','databaseError':'Impossible de charger cette base. Vos données enregistrées sont conservées.','database':'Base de données','advanced':'Blocs avancés','name':'Nom','reviewLoadError':'Les suggestions n’ont pas pu être restaurées. L’édition est désactivée pour protéger votre document.','textReviewOnly':'Passez en Édition pour changer la mise en forme ou la structure. Les suggestions suivent le texte.','editing':'Édition','suggesting':'Suggestion','review':'Réviser le texte','acceptAll':'Tout accepter','rejectAll':'Tout refuser','pending':'{count} en attente','undo':'Annuler','redo':'Rétablir','insertHint':'Tapez / pour insérer un bloc','savedError':'Non enregistré','retry':'Réessayer','odtDescription':'Document OpenDocument modifiable','odtFont':'ODT utilise les polices disponibles dans votre lecteur.','reviewExport':'Acceptez ou refusez les suggestions avant d’exporter.','odtLayout':'ODT utilise la mise en page standard de l’exporteur.'}}
for locale,values in copy.items():
 p=root/f'messages/{locale}.json';data=json.loads(p.read_text());data['editorTools']=values;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
