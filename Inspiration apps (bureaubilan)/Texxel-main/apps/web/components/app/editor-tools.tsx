"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Undo2, Redo2, ChevronDown, Check, X, PencilLine } from "lucide-react";
import { toggleSuggestChanges, isSuggestChangesEnabled, applySuggestions, revertSuggestions } from "@blocknote/prosemirror-suggest-changes";
import { reviewIds } from "@/lib/editor-review";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
export function EditorTools({ editor }: { editor: any }) {
  const t = useTranslations("editorTools");
  const [, render] = useState(0);
  useEffect(() => editor.onChange(() => render(n => n + 1)), [editor]);
  const suggesting = isSuggestChangesEnabled(editor.prosemirrorState), count = reviewIds(editor).length;
  const command = (fn: any) => { try { fn(editor.prosemirrorState, editor.prosemirrorView.dispatch); render(n => n + 1); editor.focus(); } catch { toast.error(t("reviewLoadError")); } };
  return <div className="bureau-editor-tools mb-4 flex min-h-9 items-center gap-1 border-b border-border bg-background pb-2 text-muted-foreground" data-testid="editor-tools">
    <button type="button" data-testid="editor-undo" title={t("undo")} aria-label={t("undo")} className="editor-tool" onClick={() => editor.undo()}><Undo2 size={15}/></button>
    <button type="button" data-testid="editor-redo" title={t("redo")} aria-label={t("redo")} className="editor-tool" onClick={() => editor.redo()}><Redo2 size={15}/></button>
    <span className="ml-2 hidden text-xs sm:inline">{t("insertHint")}</span>
    {count > 0 && <span role="status" className="ml-auto text-xs text-primary">{t("pending", { count })}</span>}
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" data-testid="editor-review-menu" className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-background px-2 text-xs hover:bg-muted" aria-label={t("review")}><PencilLine size={14}/>{t(suggesting ? "suggesting" : "editing")}<ChevronDown size={12}/></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem data-testid="editor-review-toggle" onClick={() => command(toggleSuggestChanges)}>{t(suggesting ? "editing" : "suggesting")}</DropdownMenuItem>
        <DropdownMenuSeparator/>
        <DropdownMenuItem data-testid="editor-review-accept" disabled={!count} onClick={() => command(applySuggestions)}><Check size={14}/>{t("acceptAll")}</DropdownMenuItem>
        <DropdownMenuItem data-testid="editor-review-reject" disabled={!count} onClick={() => command(revertSuggestions)}><X size={14}/>{t("rejectAll")}</DropdownMenuItem>
        <p className="border-t border-border px-2 py-2 text-[11px] leading-relaxed text-muted-foreground">{t("textReviewOnly")}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
