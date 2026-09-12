"use client";
import dynamic from "next/dynamic";
import { createReactBlockSpec } from "@blocknote/react";
import { useTranslations } from "next-intl";
import type { DatabaseSnapshot } from "@/lib/editor-database";
const DatabaseTable = dynamic(() => import("./database-block-table"), { ssr: false });
export const DatabaseBlock = createReactBlockSpec({ type: "database", propSchema: { data: { default: "" } }, content: "none" }, {
  render: ({ block, editor }) => {
    const t = useTranslations("editorTools");
    let snapshot: DatabaseSnapshot;
    try {
      snapshot = JSON.parse(block.props.data);
      if (!snapshot?.id || !Array.isArray(snapshot.views) || !Array.isArray(snapshot.documents)) throw new Error();
    } catch { return <div role="alert" className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("databaseError")}</div>; }
    return <div className="bureau-database-block my-3 w-full overflow-x-auto rounded-xl border border-border bg-card" contentEditable={false} data-testid="editor-database-block">
      <DatabaseTable key={snapshot.id} snapshot={snapshot} editable={editor.isEditable} onChange={next => editor.updateBlock(block, { props: { data: JSON.stringify(next) } })} />
    </div>;
  },
  toExternalHTML: ({ block }) => {
    try {
      const snapshot: DatabaseSnapshot = JSON.parse(block.props.data);
      return <div><strong>{snapshot.name}</strong><table><thead><tr>{Object.values(snapshot.schema).map(property => <th key={property.id}>{property.label}</th>)}</tr></thead><tbody>{snapshot.documents.map(row => <tr key={row.id}>{Object.keys(snapshot.schema).map(key => <td key={key}>{String(row.props[key]?.value ?? "")}</td>)}</tr>)}</tbody></table></div>;
    } catch { return <p>Database</p>; }
  },
});
