// The live chip cannot travel through Markdown/DOCX, so every export path
// degrades it to this textual label (a date chip, never a broken node). An
// unconfigured mention exports nothing.
export const getDateReminderMentionExportText = (
  label: string,
): string | null => {
  const trimmedLabel = label.trim();

  return trimmedLabel.length > 0 ? trimmedLabel : null;
};
