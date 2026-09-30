import { msg } from '@lingui/core/macro';

import { type SynaAiAction } from '@/ai/types/SynaAiAction';
import { buildLogicFunctionToolName } from '@/ai/utils/getContextToolButtons';

// The editor's context entries map to the P9.2 read-only document tools
// (`summarize-document`, `translate-document`, `improve-document-writing`).
// The tool names are derived with the same util the context buttons use so the
// mapping cannot drift from the registry. No accounting tool is listed here:
// Bilan categorization stays P7-gated, and "continue" has no backing tool yet.
export const SYNA_DOCUMENT_AI_ACTIONS: SynaAiAction[] = [
  {
    key: 'SUMMARIZE',
    label: msg`Summarize`,
    prompt: msg`Summarize this document.`,
    aliases: ['summarize', 'summary', 'résumer', 'résumé'],
    readOnly: true,
    requiredToolNames: [buildLogicFunctionToolName('summarize-document')],
  },
  {
    key: 'TRANSLATE',
    label: msg`Translate`,
    prompt: msg`Translate this document.`,
    aliases: ['translate', 'translation', 'traduire', 'traduction'],
    readOnly: true,
    requiredToolNames: [buildLogicFunctionToolName('translate-document')],
  },
  {
    key: 'IMPROVE_WRITING',
    label: msg`Improve writing`,
    prompt: msg`Improve the writing of this document.`,
    aliases: [
      'improve writing',
      'rewrite',
      'améliorer la rédaction',
      'améliorer',
    ],
    readOnly: true,
    requiredToolNames: [buildLogicFunctionToolName('improve-document-writing')],
  },
];
