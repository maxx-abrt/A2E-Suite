// The live view cannot be serialized into Markdown/DOCX, so every export path
// degrades the embed to this textual label. An unconfigured embed exports
// nothing.
export const getRecordViewEmbedExportText = (
  viewName: string,
): string | null => {
  const trimmedViewName = viewName.trim();

  return trimmedViewName.length > 0 ? trimmedViewName : null;
};
