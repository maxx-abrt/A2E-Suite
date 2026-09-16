import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';

// Gallery collection for the template reuse surface: pure selection/sort over
// the browser's flattened node list, so the section and any future entrypoint
// (new-document flow, settings) agree on what a gallery shows.

// Archived templates stay out of the gallery — restore from the trash first.
// Generic over the node shape so callers keep their richer document type.
export const collectGalleryTemplates = <GalleryDocument extends {
  title: string;
  kind: string;
  archivedAt: string | null;
}>(
  flatDocuments: GalleryDocument[],
): GalleryDocument[] =>
  flatDocuments
    .filter(
      (document) =>
        document.kind === DOCUMENT_KIND.TEMPLATE &&
        document.archivedAt === null,
    )
    .sort((document, otherDocument) =>
      document.title.localeCompare(otherDocument.title, 'fr'),
    );
