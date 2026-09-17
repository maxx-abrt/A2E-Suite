import { classifyDocumentSaveConflict } from '@/blocknote-editor/co-editing/utils/classifyDocumentSaveConflict';

const paragraph = (blockId: string, text: string) => ({
  id: blockId,
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const body = (...blocks: ReturnType<typeof paragraph>[]) =>
  JSON.stringify(blocks);

describe('classifyDocumentSaveConflict', () => {
  it('classifies an unchanged remote body as clean', () => {
    const baseBody = body(paragraph('a', 'Alpha'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha edited')),
        remoteBody: baseBody,
      }),
    ).toEqual({ outcome: 'clean', conflictingBlockIds: [] });
  });

  it('merges when the local and remote revisions touched disjoint blocks', () => {
    const baseBody = body(paragraph('a', 'Alpha'), paragraph('b', 'Beta'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha edited'), paragraph('b', 'Beta')),
        remoteBody: body(
          paragraph('a', 'Alpha'),
          paragraph('b', 'Beta edited'),
        ),
      }),
    ).toEqual({ outcome: 'merged', conflictingBlockIds: [] });
  });

  it('reports the overlapping block ids when both revisions edited the same block', () => {
    const baseBody = body(paragraph('a', 'Alpha'), paragraph('b', 'Beta'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha local'), paragraph('b', 'Beta')),
        remoteBody: body(
          paragraph('a', 'Alpha remote'),
          paragraph('b', 'Beta'),
        ),
      }),
    ).toEqual({ outcome: 'conflict', conflictingBlockIds: ['a'] });
  });

  it('treats a remotely added block as disjoint from a local text edit', () => {
    const baseBody = body(paragraph('a', 'Alpha'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha edited')),
        remoteBody: body(paragraph('a', 'Alpha'), paragraph('b', 'New block')),
      }),
    ).toEqual({ outcome: 'merged', conflictingBlockIds: [] });
  });

  it('treats a remotely removed block as disjoint from a local text edit', () => {
    const baseBody = body(paragraph('a', 'Alpha'), paragraph('b', 'Beta'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha edited'), paragraph('b', 'Beta')),
        remoteBody: body(paragraph('a', 'Alpha')),
      }),
    ).toEqual({ outcome: 'merged', conflictingBlockIds: [] });
  });

  it('conflicts when one side removed a block the other kept editing', () => {
    const baseBody = body(paragraph('a', 'Alpha'), paragraph('b', 'Beta'));

    expect(
      classifyDocumentSaveConflict({
        baseBody,
        localBody: body(paragraph('a', 'Alpha'), paragraph('b', 'Beta edited')),
        remoteBody: body(paragraph('a', 'Alpha')),
      }),
    ).toEqual({ outcome: 'conflict', conflictingBlockIds: ['b'] });
  });

  it('treats an unparseable remote body as clean when it equals the base', () => {
    expect(
      classifyDocumentSaveConflict({
        baseBody: 'not-json',
        localBody: body(paragraph('a', 'Alpha')),
        remoteBody: 'not-json',
      }),
    ).toEqual({ outcome: 'clean', conflictingBlockIds: [] });
  });

  it('classifies empty bodies as clean', () => {
    expect(
      classifyDocumentSaveConflict({
        baseBody: '',
        localBody: '',
        remoteBody: '',
      }),
    ).toEqual({ outcome: 'clean', conflictingBlockIds: [] });
  });
});
