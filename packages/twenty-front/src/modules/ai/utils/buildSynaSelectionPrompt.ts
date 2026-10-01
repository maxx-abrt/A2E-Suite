import { i18n } from '@lingui/core';

import { type SynaAiAction } from '@/ai/types/SynaAiAction';

// The selection entry stages a draft that quotes the user's selection so the
// assistant answers about that passage, not the whole document. An empty
// selection (the toolbar can appear with a collapsed range) degrades to the
// plain document prompt rather than staging a dangling instruction.
export const buildSynaSelectionPrompt = (
  action: SynaAiAction,
  selectedText: string,
): string => {
  const trimmedSelection = selectedText.trim();

  if (trimmedSelection.length === 0) {
    return i18n._(action.prompt);
  }

  return `${i18n._(action.selectionPrompt)}\n\n${trimmedSelection}`;
};
