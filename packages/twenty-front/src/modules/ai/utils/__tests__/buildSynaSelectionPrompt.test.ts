import { buildSynaSelectionPrompt } from '@/ai/utils/buildSynaSelectionPrompt';
import { type SynaAiAction } from '@/ai/types/SynaAiAction';
import { msg } from '@lingui/core/macro';

const summarizeAction: SynaAiAction = {
  key: 'SUMMARIZE',
  label: msg`Summarize`,
  prompt: msg`Summarize this document.`,
  selectionPrompt: msg`Summarize the following selection:`,
  aliases: [],
  readOnly: true,
  requiredToolNames: ['tool'],
};

describe('buildSynaSelectionPrompt', () => {
  it('references the selected text in the staged draft', () => {
    const prompt = buildSynaSelectionPrompt(
      summarizeAction,
      '  A selected passage  ',
    );

    expect(prompt).toContain('Summarize the following selection:');
    expect(prompt).toContain('A selected passage');
  });

  it('degrades to the document prompt when nothing is selected', () => {
    expect(buildSynaSelectionPrompt(summarizeAction, '   ')).toBe(
      'Summarize this document.',
    );
  });
});
