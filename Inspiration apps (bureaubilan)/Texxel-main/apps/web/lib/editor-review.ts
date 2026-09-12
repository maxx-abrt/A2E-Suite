import { Mark } from "@tiptap/core";
import { createExtension } from "@blocknote/core";
import { insertion, deletion, modification, suggestChanges, withSuggestChanges, isSuggestChangesEnabled, suggestChangesKey } from "@blocknote/prosemirror-suggest-changes";
import type { EditorView } from "@tiptap/pm/view";
import type { Transaction } from "@tiptap/pm/state";

const specs = { insertion, deletion, modification };
export const reviewStyles = Object.fromEntries(Object.entries(specs).map(([name, spec]) => {
  const render = () => { const dom = document.createElement(name === "insertion" ? "ins" : name === "deletion" ? "del" : "span"); dom.dataset.review = name; return { dom, contentDOM: dom }; };
  return [name, {
    config: { type: name, propSchema: "boolean" as const },
    implementation: {
      mark: Mark.create({
        name, inclusive: false, excludes: spec.excludes,
        addAttributes: () => Object.fromEntries(Object.entries(spec.attrs ?? {}).map(([key, value]) => [key, { default: "default" in value ? value.default : key === "id" ? 0 : "" }])),
        parseHTML: () => [{ tag: `[data-review="${name}"]` }],
        renderHTML: ({ HTMLAttributes }) => [name === "insertion" ? "ins" : name === "deletion" ? "del" : "span", { ...HTMLAttributes, "data-review": name }, 0],
      }),
      render,
      toExternalHTML: render,
    },
  }];
}));
export const ReviewExtension = createExtension({ key: "bureau-review", prosemirrorPlugins: [suggestChanges()] });

/**
 * Transaction meta key marking programmatic (non-user) dispatches — comment
 * anchor rehydration and review restore. `onChange` side effects (content
 * save, anchor sync, mention scan) must skip these or they feed the
 * syncAnchors → threadRows → rehydrate render loop that freezes the tab.
 */
export const SYNTHETIC_META = "bureauSynthetic";

/** Editors whose most recent dispatch was programmatic (set by the wrapped dispatch / restore paths). */
const syntheticEdits = new WeakMap<object, boolean>();

/** True when the editor's most recent transaction was dispatched programmatically. */
export function isSyntheticChange(editor: any): boolean {
  return syntheticEdits.get(editor?.prosemirrorView) === true;
}
export function reviewIds(editor: any): number[] {
  const ids = new Set<number>();
  editor.prosemirrorState.doc.descendants((node: any) => {
    for (const mark of node.marks) if (mark.type.name in specs) ids.add(mark.attrs.id);
  });
  return [...ids];
}
/** Keep ordinary BlockNote arrays interoperable; pending review metadata travels with copies/versions/encryption. */
export function serializeEditor(editor: any): string {
  const blocks = editor.document.map((block: any) => ({ ...block }));
  if (blocks.length && reviewIds(editor).length) blocks[0]._bureauReview = { version: 1, doc: editor.prosemirrorState.doc.toJSON() };
  return JSON.stringify(blocks);
}
export function restoreReview(editor: any, content?: string): void {
  if (!content) return;
  const review = JSON.parse(content)?.[0]?._bureauReview;
  if (!review) return;
  if (review.version !== 1) throw new Error("Unsupported review version");
  const state = editor.prosemirrorState;
  const doc = state.schema.nodeFromJSON(review.doc);
  doc.check();
  syntheticEdits.set(editor.prosemirrorView, true);
  editor.prosemirrorView.dispatch(state.tr.replaceWith(0, state.doc.content.size, doc.content).setMeta(suggestChangesKey, { skip: true }).setMeta(SYNTHETIC_META, true).setMeta("addToHistory", false));
}
/** Preserve Tiptap's dispatch pipeline. Text-only capture avoids upstream structural/formatting rollback defects. */
export function attachReview(editor: any, onUnsupported: () => void): () => void {
  const view: EditorView = editor.prosemirrorView;
  const original = view.props.dispatchTransaction;
  if (!original) throw new Error("Editor dispatch is not available");
  const tracked = withSuggestChanges(original);
  const dispatch = function(this: EditorView, tr: Transaction) {
    syntheticEdits.set(this, tr.getMeta(SYNTHETIC_META) === true);
    if (isSuggestChangesEnabled(this.state) && tr.docChanged && !tr.getMeta(suggestChangesKey)?.skip && !tr.getMeta("history$")) {
      const textOnly = tr.steps.every((step: any) => {
        const json = step.toJSON();
        if (json.stepType !== "replace" || !Number.isInteger(json.from) || !Number.isInteger(json.to)) return false;
        const before = tr.docs[tr.steps.indexOf(step)];
        const from = before.resolve(json.from), to = before.resolve(json.to);
        return from.sameParent(to) && from.parent.isTextblock && !(json.slice?.content ?? []).some((node: any) => node.type !== "text");
      });
      if (!textOnly) { onUnsupported(); return; }
    }
    tracked.call(this, tr);
  };
  view.setProps({ dispatchTransaction: dispatch });
  return () => { if (!view.isDestroyed && view.props.dispatchTransaction === dispatch) view.setProps({ dispatchTransaction: original }); };
}
