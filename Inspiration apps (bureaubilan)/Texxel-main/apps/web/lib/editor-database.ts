import { Collection, CollectionView, EntityRegistry, Reference } from "@blocknote/block-view/core";
import type { CollectionSource, DocumentSource } from "@blocknote/block-view/core/sources";
import { InMemoryDocumentSource } from "@blocknote/block-view/core/sources/in-memory";
export type DatabaseSnapshot = ReturnType<Collection["toJSON"]>;
export function emptyDatabase(id: string, userId: string, name: string, titleLabel: string): DatabaseSnapshot {
  const user = new Reference({ type: "user", id: userId });
  const now = Date.now();
  const registry = new EntityRegistry();
  new CollectionView({ id: `${id}-table`, type: "table", collectionId: id, manualSortOrder: [], filters: [], sorts: [], columns: [], createdBy: user, updatedBy: user, createdAt: now, updatedAt: now, role: "editor", registry });
  const collection = new Collection({ id, name, schema: {}, documents: [], size: 0, createdBy: user, updatedBy: user, createdAt: now, updatedAt: now, role: "editor", viewId: `${id}-table`, registry });
  collection.addProperty({ id: `${id}-title`, label: titleLabel, type: "string" });
  return collection.toJSON();
}
/** Persist every source mutation to the parent BlockNote block, never a demo-only memory store. */
export function databaseSources(initial: DatabaseSnapshot, save: (snapshot: DatabaseSnapshot) => void) {
  let snapshot = structuredClone(initial);
  const commit = () => { snapshot.size = snapshot.documents.length; save(structuredClone(snapshot)); };
  const collectionSource: CollectionSource = {
    fetch: async () => ({ ...snapshot, documents: [] }),
    update: async (ctx, changes) => {
      snapshot = { ...ctx.collection.toJSON(), documents: snapshot.documents };
      commit();
    },
  };
  const documentSource: DocumentSource = {
    fetch: async (id, params) => snapshot.documents.length ? new InMemoryDocumentSource(snapshot.documents).fetch(id, params) : { data: [], totalCount: 0 },
    create: async (ctx) => { snapshot.documents.push(ctx.document.toJSON()); commit(); },
    update: async (ctx, changes) => { snapshot.documents = snapshot.documents.map(doc => doc.id === ctx.documentId ? ctx.document.toJSON() : doc); commit(); },
    delete: async (ctx) => { snapshot.documents = snapshot.documents.filter(doc => doc.id !== ctx.documentId); commit(); },
  };
  return { collectionSource, documentSource, persistDebounceMs: 0, offlineMode: false, devtools: false };
}
