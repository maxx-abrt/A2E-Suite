from pathlib import Path
r=Path('/app/Texxel/apps/web')
def edit(path,fn):
 p=r/path;p.write_text(fn(p.read_text()))
def save(s):
 s='import { useDocumentSave } from "@/hooks/use-document-save";\n'+s
 s=s.replace('"use client";\n','',1);s='"use client";\n'+s
 s=s.replace('  const [saving, setSaving] = useState(false);','  const saveQueue = useDocumentSave(documentId);\n  const saving = saveQueue.status === "saving";\n  const tx = useTranslations("editorTools");')
 a=s.index('  const saveTitle = useCallback(');b=s.index('  const onUploadCover',a)
 s=s[:a]+'''  const saveTitle = (value: string) => {
    setTitle(value);
    saveQueue.enqueue("title", () => update({ documentId, title: value.trim() || te("untitled") }));
  };
  const saveContent = (content: string) => {
    setIsEditing(true);
    clearTimeout(editingTimer.current);
    editingTimer.current = setTimeout(() => setIsEditing(false), 8000);
    saveQueue.enqueue("content", async () => {
      if (doc?.isLocked) {
        if (!currentPassphrase) throw new Error("Unlock the document before editing");
        const { ciphertext, salt, iv } = await encryptContent(content, currentPassphrase);
        await setLock({ documentId, content: ciphertext, isLocked: true, passphraseSalt: salt, lockIv: iv, passphraseHint: doc.passphraseHint });
      } else await update({ documentId, content });
    });
  };
  useEffect(() => () => { clearTimeout(editingTimer.current); clearTimeout(mentionTimer.current); }, []);

'''+s[b:]
 s=s.replace('          {saving ? (','          {saveQueue.status === "error" ? <button type="button" data-testid="doc-save-retry" onClick={saveQueue.retry} className="text-destructive underline underline-offset-2">{tx("savedError")} · {tx("retry")}</button> : saving ? (')
 s=s.replace('data-testid="doc-save-state">','data-testid="doc-save-state" role="status" aria-live="polite">')
 s=s.replace('                        await update({ documentId, content: ciphertext });\n                        await setLock({ documentId, isLocked: true,','                        await setLock({ documentId, content: ciphertext, isLocked: true,')
 s=s.replace('                        await update({ documentId, content: plainContent });\n                        await setLock({ documentId, isLocked: false });','                        await setLock({ documentId, content: plainContent, isLocked: false });')
 return s
edit('components/app/document-view.tsx',save)
edit('hooks/use-document-save.ts',lambda s:s.replace('  const mounted = useRef(true);','  const mounted = useRef(true);\n  const activeId = useRef(documentId); activeId.current = documentId;').replace('if (mounted.current) setStatus(state)','if (mounted.current && activeId.current === documentId) setStatus(state)'))
def export(s):
 s=s.replace('import { cn }', 'import { reviewIds } from "@/lib/editor-review";\nimport { exportableBlocks } from "@/lib/editor-export";\nimport { cn }')
 s=s.replace('  const t = useTranslations("docsExperience.export");','  const t = useTranslations("docsExperience.export");\n  const tx = useTranslations("editorTools");')
 s=s.replace('useState<"pdf" | "docx">','useState<"pdf" | "docx" | "odt">')
 s=s.replace('    if (!selectedFont) return t("builtInFonts");','    if (format === "odt") return tx("odtFont");\n    if (!selectedFont) return t("builtInFonts");')
 s=s.replace('}, [selectedFont, format, t]);','}, [selectedFont, format, t, tx]);')
 s=s.replace('}, ...editor.document]','}, ...exportableBlocks(editor.document)]').replace('    : editor.document;','    : exportableBlocks(editor.document);')
 s=s.replace('    const mappings: any = {\n      ...pdfDefaultSchemaMappings,','    const [math, diagram] = await Promise.all([import("@blocknote/math-block/pdf-exporter"), import("@blocknote/diagram-block/pdf-exporter")]);\n    const mappings: any = {\n      ...pdfDefaultSchemaMappings,\n      blockMapping: { ...pdfDefaultSchemaMappings.blockMapping, mathBlock: math.mathBlockMapping, diagram: diagram.diagramBlockMapping },\n      styleMapping: { ...pdfDefaultSchemaMappings.styleMapping, font: () => ({}) },')
 s=s.replace('        ...pdfDefaultSchemaMappings.inlineContentMapping,','        ...pdfDefaultSchemaMappings.inlineContentMapping,\n        math: math.inlineMathMapping,')
 s=s.replace('    const mappings: any = {\n      ...docxDefaultSchemaMappings,','    const [math, diagram] = await Promise.all([import("@blocknote/math-block/docx-exporter"), import("@blocknote/diagram-block/docx-exporter")]);\n    const mappings: any = {\n      ...docxDefaultSchemaMappings,\n      blockMapping: { ...docxDefaultSchemaMappings.blockMapping, mathBlock: math.mathBlockMapping, diagram: diagram.diagramBlockMapping },\n      styleMapping: { ...docxDefaultSchemaMappings.styleMapping, font: (value: string) => ({ font: value }) },')
 s=s.replace('        ...docxDefaultSchemaMappings.inlineContentMapping,','        ...docxDefaultSchemaMappings.inlineContentMapping,\n        math: math.inlineMathMapping,')
 s=s.replace('  const exportNow = async () => {','''  const doOdt = async () => {
    setState("resolving"); setProgress(30);
    const [{ ODTExporter, odtDefaultSchemaMappings }, math, diagram] = await Promise.all([
      import("@blocknote/xl-odt-exporter"), import("@blocknote/math-block/odt-exporter"), import("@blocknote/diagram-block/odt-exporter"),
    ]);
    const exporter = new ODTExporter(editor.schema, {
      ...odtDefaultSchemaMappings,
      blockMapping: { ...odtDefaultSchemaMappings.blockMapping, mathBlock: math.mathBlockMapping, diagram: diagram.diagramBlockMapping },
      inlineContentMapping: { ...odtDefaultSchemaMappings.inlineContentMapping, math: math.inlineMathMapping, mention: (value: any) => React.createElement("text:span", null, `${value.props.kind === "task" ? "#" : "@"}${value.props.label}`) },
      styleMapping: { ...odtDefaultSchemaMappings.styleMapping, font: (value: string) => ({ "fo:font-family": value }) },
    } as any, { resolveFileUrl: resolveAsset });
    setState("rendering"); setProgress(65);
    return exporter.toODTDocument(blocks(), { header: headerEnabled ? headerText.replace("{title}", title).replace("{date}", formatDate()) : undefined, footer: footerEnabled ? footerText.replace("{title}", title).replace("{date}", formatDate()) : undefined });
  };

  const exportNow = async () => {''')
 s=s.replace('    if (!editor) return toast.error(t("editorLoading"));','    if (!editor) return toast.error(t("editorLoading"));\n    if (reviewIds(editor).length) return toast.error(tx("reviewExport"));')
 s=s.replace('      const blob = format === "pdf" ? await doPdf() : await doDocx();','      const blob = format === "pdf" ? await doPdf() : format === "docx" ? await doDocx() : await doOdt();')
 s=s.replace('grid grid-cols-2 gap-2','grid grid-cols-3 gap-2').replace('(["pdf", "docx"] as const)','(["pdf", "docx", "odt"] as const)')
 s=s.replace('type="button" onClick={() => setFormat(item)}','type="button" disabled={busy} aria-pressed={format === item} onClick={() => setFormat(item)}')
 s=s.replace('{t(item === "pdf" ? "pdfDescription" : "docxDescription")}','{item === "odt" ? tx("odtDescription") : t(item === "pdf" ? "pdfDescription" : "docxDescription")}')
 s=s.replace('<select value={pageSize}', '<select disabled={busy || format === "odt"} value={pageSize}').replace('<input type="range" min="24"','<input disabled={busy || format === "odt"} type="range" min="24"')
 s=s.replace('            <label className="mt-3 flex', '            {format === "odt" && <p className="mt-2 text-xs text-muted-foreground">{tx("odtLayout")}</p>}\n            <label className="mt-3 flex')
 return s
edit('components/app/export-dialog.tsx',export)
