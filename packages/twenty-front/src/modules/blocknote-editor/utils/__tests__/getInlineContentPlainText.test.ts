import { getInlineContentPlainText } from '@/blocknote-editor/utils/getInlineContentPlainText';
import { describe, expect, it } from '@jest/globals';

describe('getInlineContentPlainText', () => {
  it('joins text runs and trims the result', () => {
    expect(
      getInlineContentPlainText([
        { type: 'text', text: ' Relancer ' },
        { type: 'text', text: 'le client' },
      ]),
    ).toBe('Relancer le client');
  });

  it('recurses into nested link content', () => {
    expect(
      getInlineContentPlainText([
        { type: 'link', content: [{ type: 'text', text: 'Agenda' }] },
      ]),
    ).toBe('Agenda');
  });

  it('ignores mentions and non-string text', () => {
    expect(
      getInlineContentPlainText([
        { type: 'mention', props: { label: 'Alice' } },
        { type: 'text', text: 42 },
      ]),
    ).toBe('');
  });

  it('returns empty string for non-array input', () => {
    expect(getInlineContentPlainText(null)).toBe('');
    expect(getInlineContentPlainText('text')).toBe('');
  });
});
