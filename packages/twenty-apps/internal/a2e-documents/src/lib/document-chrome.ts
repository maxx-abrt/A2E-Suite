// Page-chrome preferences and write payloads for the document page (M8c).
//
// Kept pure so the component only wires state and Core API calls, and so the
// field payload shape is unit-testable without the sandbox. The chrome fields
// are presentation-only (C5); none grants or hides anything.

export type DocumentChromeFields = {
  icon?: string | null;
  coverColor?: string | null;
  coverImage?: string | null;
  isFullWidth?: boolean | null;
  isSmallText?: boolean | null;
  isLocked?: boolean | null;
};

export type DocumentChromePreferences = {
  icon: string | null;
  coverColor: string | null;
  coverImage: string | null;
  isFullWidth: boolean;
  isSmallText: boolean;
  isLocked: boolean;
};

export type DocumentChromePatch = {
  icon?: string | null;
  coverColor?: string | null;
  coverImage?: string | null;
  isFullWidth?: boolean;
  isSmallText?: boolean;
  isLocked?: boolean;
};

const normalizeText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
};

export const readDocumentChromePreferences = (
  fields: DocumentChromeFields,
): DocumentChromePreferences => ({
  icon: normalizeText(fields.icon),
  coverColor: normalizeText(fields.coverColor),
  coverImage: normalizeText(fields.coverImage),
  isFullWidth: fields.isFullWidth === true,
  isSmallText: fields.isSmallText === true,
  isLocked: fields.isLocked === true,
});

// A calm, theme-safe cover palette. Stored as an explicit color so light and
// dark surfaces render identically (no alpha over an unknown backdrop).
export const DOCUMENT_COVER_COLOR_CHOICES = [
  '#4338ca',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#7e22ce',
  '#0369a1',
] as const;

export const DEFAULT_DOCUMENT_COVER_COLOR = '#4338ca';

export type DocumentCover =
  | { kind: 'image'; source: string }
  | { kind: 'color'; color: string }
  | { kind: 'none' };

const looksLikeImage = (value: string): boolean =>
  /^https?:\/\//i.test(value) ||
  value.startsWith('data:image/') ||
  value.startsWith('/');

export const resolveDocumentCover = (
  fields: DocumentChromeFields,
): DocumentCover => {
  const coverImage = normalizeText(fields.coverImage);

  if (coverImage !== null && looksLikeImage(coverImage)) {
    return { kind: 'image', source: coverImage };
  }

  const coverColor = normalizeText(fields.coverColor);

  if (coverColor !== null) {
    return { kind: 'color', color: coverColor };
  }

  return { kind: 'none' };
};

// Only the keys the caller actually set are written; an empty string clears a
// nullable text field to null rather than persisting a blank.
export const buildDocumentChromeUpdatePayload = (
  patch: DocumentChromePatch,
): Record<string, string | boolean | null> => {
  const payload: Record<string, string | boolean | null> = {};

  if (patch.icon !== undefined) {
    payload.icon = normalizeText(patch.icon);
  }

  if (patch.coverColor !== undefined) {
    payload.coverColor = normalizeText(patch.coverColor);
  }

  if (patch.coverImage !== undefined) {
    payload.coverImage = normalizeText(patch.coverImage);
  }

  if (patch.isFullWidth !== undefined) {
    payload.isFullWidth = patch.isFullWidth;
  }

  if (patch.isSmallText !== undefined) {
    payload.isSmallText = patch.isSmallText;
  }

  if (patch.isLocked !== undefined) {
    payload.isLocked = patch.isLocked;
  }

  return payload;
};
