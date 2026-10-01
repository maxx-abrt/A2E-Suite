// Machine-readable warnings for the Bureau markdown/Notion import path,
// mirroring `HtmlImportWarning`: the UI maps the keys to localized strings so
// the conversion utilities stay Lingui-free and testable.

export type DocumentImportWarningKind =
  | 'image-unmapped'
  | 'attachment-skipped'
  | 'page-title-from-heading'
  | 'unsupported-markdown-block';

export type DocumentImportWarning = {
  kind: DocumentImportWarningKind;
  element: string;
};
