import {
  buildDocumentCursorContext,
  parseDocumentCursorContext,
} from '@/blocknote-editor/co-editing/utils/documentCursorContext';

describe('documentCursorContext', () => {
  it('builds and parses a round-trip context', () => {
    const context = buildDocumentCursorContext({
      documentRecordId: 'doc-1',
      blockId: 'block-2',
    });

    expect(context).toBe('doc:doc-1:block-2');
    expect(parseDocumentCursorContext(context)).toEqual({
      documentRecordId: 'doc-1',
      blockId: 'block-2',
    });
  });

  it('rejects non-document typing contexts', () => {
    expect(parseDocumentCursorContext('look at this draft')).toBeNull();
    expect(parseDocumentCursorContext('chat:123:456')).toBeNull();
  });

  it('rejects malformed document contexts', () => {
    expect(parseDocumentCursorContext('doc:only-two')).toBeNull();
    expect(parseDocumentCursorContext('doc::block')).toBeNull();
  });
});
