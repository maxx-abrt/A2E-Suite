import { buildChildDocumentInput } from '@/blocknote-editor/utils/buildChildDocumentInput';
import { describe, expect, it } from '@jest/globals';

describe('buildChildDocumentInput', () => {
  it('nests the new page under the current document', () => {
    expect(
      buildChildDocumentInput({
        title: 'Notes de réunion',
        parentDocumentId: 'doc-parent',
      }),
    ).toEqual({
      title: 'Notes de réunion',
      kind: 'DOCUMENT',
      parentId: 'doc-parent',
    });
  });

  it('creates at the root when the parent is unknown', () => {
    const input = buildChildDocumentInput({ title: 'Notes' });

    expect(input).toEqual({ title: 'Notes', kind: 'DOCUMENT' });
    expect(input).not.toHaveProperty('parentId');
  });

  it('trims the title and keeps an empty one', () => {
    expect(buildChildDocumentInput({ title: '  Plan  ' }).title).toBe('Plan');
    expect(buildChildDocumentInput({ title: '   ' }).title).toBe('');
  });
});
