import { describe, expect, it } from '@jest/globals';
import { msg } from '@lingui/core/macro';

import { SYNA_DOCUMENT_AI_ACTIONS } from '@/ai/constants/synaDocumentAiActions';
import { type SynaAiAction } from '@/ai/types/SynaAiAction';
import { getOfferedSynaActions } from '@/ai/utils/getOfferedSynaActions';

const readOnlyAction: SynaAiAction = {
  key: 'SUMMARIZE',
  label: msg`Summarize`,
  prompt: msg`Summarize this document.`,
  aliases: [],
  readOnly: true,
  requiredToolNames: ['app_summarize_document'],
};

const mutatingAction: SynaAiAction = {
  key: 'SUMMARIZE',
  label: msg`Categorize transactions`,
  prompt: msg`Categorize these transactions.`,
  aliases: [],
  readOnly: false,
  requiredToolNames: ['app_categorize_transactions'],
};

const noToolAction: SynaAiAction = {
  key: 'SUMMARIZE',
  label: msg`Continue`,
  prompt: msg`Continue writing.`,
  aliases: [],
  readOnly: true,
  requiredToolNames: [],
};

describe('getOfferedSynaActions', () => {
  it('offers nothing without the AI permission flag', () => {
    expect(
      getOfferedSynaActions({
        actions: [readOnlyAction],
        hasAiPermissionFlag: false,
        hasAvailableModel: true,
        availableReadOnlyToolNames: new Set(['app_summarize_document']),
      }),
    ).toEqual([]);
  });

  it('offers nothing without an available model (zero-AI mode)', () => {
    expect(
      getOfferedSynaActions({
        actions: [readOnlyAction],
        hasAiPermissionFlag: true,
        hasAvailableModel: false,
        availableReadOnlyToolNames: new Set(['app_summarize_document']),
      }),
    ).toEqual([]);
  });

  it('never offers a mutating action, even when its tool is available', () => {
    const offered = getOfferedSynaActions({
      actions: [mutatingAction],
      hasAiPermissionFlag: true,
      hasAvailableModel: true,
      availableReadOnlyToolNames: new Set(['app_categorize_transactions']),
    });

    expect(offered).toEqual([]);
  });

  it('only offers an action whose backing tool is available in context', () => {
    const offered = getOfferedSynaActions({
      actions: [readOnlyAction],
      hasAiPermissionFlag: true,
      hasAvailableModel: true,
      availableReadOnlyToolNames: new Set(['app_translate_document']),
    });

    expect(offered).toEqual([]);
  });

  it('offers a read-only action once its tool is available', () => {
    const offered = getOfferedSynaActions({
      actions: [readOnlyAction],
      hasAiPermissionFlag: true,
      hasAvailableModel: true,
      availableReadOnlyToolNames: new Set(['app_summarize_document']),
    });

    expect(offered).toEqual([readOnlyAction]);
  });

  it('fails closed for a read-only action with no declared backing tool', () => {
    const offered = getOfferedSynaActions({
      actions: [noToolAction],
      hasAiPermissionFlag: true,
      hasAvailableModel: true,
      availableReadOnlyToolNames: new Set(),
    });

    expect(offered).toEqual([]);
  });

  it('maps the shipped document actions to the P9.2 read-only tools', () => {
    expect(SYNA_DOCUMENT_AI_ACTIONS).toHaveLength(3);

    for (const action of SYNA_DOCUMENT_AI_ACTIONS) {
      expect(action.readOnly).toBe(true);
      expect(action.requiredToolNames).toHaveLength(1);
    }

    expect(
      SYNA_DOCUMENT_AI_ACTIONS.map((action) => action.requiredToolNames[0]),
    ).toEqual([
      'app_summarize_document',
      'app_translate_document',
      'app_improve_document_writing',
    ]);
  });
});
