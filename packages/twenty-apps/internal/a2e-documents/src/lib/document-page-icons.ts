// Page-icon dictionary for the document chrome (M8c).
//
// Stored in the document's existing `icon` TEXT field, so no new column is
// needed for the icon itself. Emoji are the portable choice for an app front
// component: it cannot import twenty-ui, so it cannot paint a tabler name.
// A twenty-ui icon name set elsewhere is still accepted verbatim (the surface
// falls back to it), which keeps the field compatible with any host-side
// renderer.

export const DEFAULT_DOCUMENT_PAGE_ICON = '📄';

export const DOCUMENT_PAGE_ICON_CHOICES = [
  '📄',
  '📝',
  '📌',
  '📎',
  '🔖',
  '📚',
  '🗂️',
  '💡',
  '✅',
  '📊',
  '🧭',
  '🎯',
  '🗒️',
  '📁',
  '⭐',
  '🔒',
] as const;

export type DocumentPageIconChoice =
  (typeof DOCUMENT_PAGE_ICON_CHOICES)[number];

export const resolveDocumentPageIcon = (
  icon: string | null | undefined,
): string => {
  if (typeof icon !== 'string') {
    return DEFAULT_DOCUMENT_PAGE_ICON;
  }

  const trimmed = icon.trim();

  return trimmed === '' ? DEFAULT_DOCUMENT_PAGE_ICON : trimmed;
};
