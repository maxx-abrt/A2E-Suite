import { type MessageDescriptor } from '@lingui/core';

// One "Syna in context" entry: a named action that is only ever staged as a
// prompt draft, never dispatched straight from the entry point. `requiredToolNames`
// are native-registry tool names (see `buildLogicFunctionToolName`) that must be
// available in the current browsing context for the entry to be offered.
export type SynaAiActionKey = 'SUMMARIZE' | 'TRANSLATE' | 'IMPROVE_WRITING';

export type SynaAiAction = {
  key: SynaAiActionKey;
  label: MessageDescriptor;
  prompt: MessageDescriptor;
  aliases: string[];
  // Fail-closed confirm-first policy: a mutating action is never offered here.
  // Mutating registry categories stay reachable only through the draft+confirm
  // chat path (the PREFILL staging contract).
  readOnly: boolean;
  requiredToolNames: string[];
};
