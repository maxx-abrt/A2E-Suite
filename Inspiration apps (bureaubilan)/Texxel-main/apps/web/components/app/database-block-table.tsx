"use client";
import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { defaultPropertyDefinitions, TableView, useCollectionManager, useCollectionTableView } from "@blocknote/block-view/react";
import type { CollectionManager } from "@blocknote/block-view/core";
import { databaseSources, type DatabaseSnapshot } from "@/lib/editor-database";
import "@blocknote/block-view/react/styles.css";
import "@blocknote/block-view/react/adapters/styles.css";

export default function DatabaseTable({ snapshot, onChange, editable }: { snapshot: DatabaseSnapshot; onChange: (value: DatabaseSnapshot) => void; editable: boolean }) {
  const t = useTranslations("editorTools");
  const ref = useRef(onChange); ref.current = onChange;
  const initialize = useCallback(async () => databaseSources(snapshot, next => ref.current(next)), [snapshot.id]);
  const result = useCollectionManager({ collectionId: snapshot.id, user: snapshot.createdBy, initialize });
  if (result.status === "loading") return <div className="p-4 text-sm text-muted-foreground" role="status">{t("loadingDatabase")}</div>;
  if (result.status === "error") return <div className="p-4 text-sm text-destructive" role="alert">{t("databaseError")} {result.error.message}</div>;
  return <DatabaseContent manager={result.manager} editable={editable} />;
}
function DatabaseContent({ manager, editable }: { manager: CollectionManager; editable: boolean }) {
  const { table } = useCollectionTableView({ collectionManager: manager, viewId: manager.views[0].id, propertyDefinitions: defaultPropertyDefinitions, editable: () => editable });
  return <TableView table={table} editable={editable} />;
}
