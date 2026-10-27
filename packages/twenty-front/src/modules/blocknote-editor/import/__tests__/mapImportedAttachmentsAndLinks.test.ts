import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';

const paragraph = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const image = (url: string) => ({ type: 'image', props: { url, caption: '' } });

const linkParagraph = (href: string) => ({
  type: 'paragraph',
  content: [{ type: 'link', href, content: [{ type: 'text', text: 'x' }] }],
});

describe('mapImportedAttachmentsAndLinks', () => {
  it('rewrites links inside table cells without flattening the table', () => {
    const { blocks } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'table',
          content: {
            type: 'tableContent',
            rows: [
              {
                cells: [
                  [
                    {
                      type: 'link',
                      href: 'Child.html',
                      content: [{ type: 'text', text: 'Child' }],
                    },
                  ],
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'link',
                        href: 'Child.html',
                        content: [{ type: 'text', text: 'Child' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      { resolveLinkUrl: () => '/bureau/child-id' },
    );
    expect(JSON.stringify(blocks)).not.toContain('Child.html');
    expect(JSON.stringify(blocks)).toContain('/bureau/child-id');
    expect(blocks[0].type).toBe('table');
  });
  it('rewrites attachment URLs through the resolver', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [image('https://external.example/a.png')],
      { resolveAttachmentUrl: () => 'https://ws.example/file/a.png' },
    );

    expect((blocks[0].props as { url: string }).url).toBe(
      'https://ws.example/file/a.png',
    );
    expect(warnings).toEqual([]);
  });

  it('keeps a readable reference for unmapped attachments and warns', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [image('https://external.example/a.png'), paragraph('keep')],
      { resolveAttachmentUrl: () => null, preserveUnmappedAttachments: true },
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'https://external.example/a.png' }],
    });
    expect(warnings).toEqual([
      { kind: 'attachment-unmapped', element: 'image' },
    ]);
  });

  it('flattens unmapped links but keeps their text', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [linkParagraph('https://external.example/x')],
      { resolveLinkUrl: () => null },
    );

    expect(blocks[0].content).toEqual([{ type: 'text', text: 'x' }]);
    expect(warnings).toEqual([{ kind: 'link-unmapped', element: 'a' }]);
  });

  it('rewrites link hrefs through the resolver', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [linkParagraph('https://external.example/x')],
      { resolveLinkUrl: () => '/object/document/1' },
    );

    expect(blocks[0].content).toEqual([
      {
        type: 'link',
        href: '/object/document/1',
        content: [{ type: 'text', text: 'x' }],
      },
    ]);
    expect(warnings).toEqual([]);
  });

  it('maps nested children recursively', () => {
    const { blocks } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'parent' }],
          children: [image('https://external.example/a.png')],
        },
      ],
      { resolveAttachmentUrl: () => 'https://ws.example/file/a.png' },
    );

    const children = blocks[0].children as Array<{
      props: { url: string };
    }>;

    expect(children[0].props.url).toBe('https://ws.example/file/a.png');
  });

  it('ignores non-object blocks instead of throwing', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks([
      null,
      'nope',
      paragraph('ok'),
    ]);

    expect(blocks).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it('drops dangerous URL protocols from links but keeps their text', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks([
      linkParagraph('data:text/html,evil'),
      // oxlint-disable-next-line no-script-url -- this is the sanitizer's blocklist
      linkParagraph('javascript:alert(1)'),
      linkParagraph('//protocol-relative.example/x'),
    ]);

    expect(blocks).toHaveLength(3);
    expect(
      blocks.every(
        (block) =>
          block.content !== undefined &&
          (block.content as { type: string }) !== null &&
          !JSON.stringify(blocks).includes('"type":"link"'),
      ),
    ).toBe(true);
    expect(warnings).toHaveLength(3);
    expect(warnings.every((warning) => warning.kind === 'link-unmapped')).toBe(
      true,
    );
  });

  it('treats dangerous attachment URLs like unmapped ones', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [image('data:image/png;base64,AAA'), paragraph('after')],
      { preserveUnmappedAttachments: true },
    );

    expect(blocks[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'data:image/png;base64,AAA' }],
    });
    expect(warnings).toEqual([
      { kind: 'attachment-unmapped', element: 'image' },
    ]);
  });

  it('rejects anchors and unresolved archive URLs before saving, retaining readable content', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        linkParagraph('#notes'),
        linkParagraph('Child.html'),
        linkParagraph('https://'),
        image('photo.png'),
      ],
      { preserveUnmappedAttachments: true },
    );
    expect(JSON.stringify(blocks)).not.toContain('"href"');
    expect(blocks[3]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'photo.png' }],
    });
    expect(warnings).toHaveLength(4);
    expect(
      mapImportedAttachmentsAndLinks([image('photo.png')], {
        allowArchiveRelativeUrls: true,
      }).blocks[0],
    ).toMatchObject({ type: 'image', props: { url: 'photo.png' } });
  });

  it('flattens preview relation chips without requiring a page resolver', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              props: {
                recordId: 'Child%20page.html#notes',
                label: 'Related page',
              },
            },
          ],
        },
      ],
      { flattenUnresolvedPageLinks: true },
    );
    expect(blocks[0].content).toEqual([{ type: 'text', text: 'Related page' }]);
    expect(warnings).toEqual([
      { kind: 'mention-unmapped', element: 'mention' },
    ]);
  });

  it('resolves absolute source page URLs rather than treating them as workspace record ids', () => {
    const { blocks } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'pageLink',
          props: { documentId: 'https://www.notion.so/Notes', title: 'Notes' },
        },
      ],
      { resolvePageLink: () => 'record-1', flattenUnresolvedPageLinks: true },
    );
    expect(blocks[0]).toMatchObject({
      type: 'pageLink',
      props: { documentId: 'record-1' },
    });
  });

  it('keeps unresolved page-link placeholders when no page-link resolver runs', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks([
      {
        type: 'pageLink',
        props: { documentId: 'notion:abc', title: '📚 Notes' },
      },
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('pageLink');
    expect(warnings).toEqual([]);
  });

  it('resolves page-link placeholders to created record ids', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'pageLink',
          props: { documentId: 'notion:abc', title: '📚 Notes' },
        },
      ],
      {
        resolvePageLink: (target) =>
          target === 'notion:abc' ? 'record-1' : null,
      },
    );

    expect(blocks[0].type).toBe('pageLink');
    expect((blocks[0].props as { documentId: string }).documentId).toBe(
      'record-1',
    );
    expect(warnings).toEqual([]);
  });

  it('degrades unresolved page-link placeholders to their title text', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'pageLink',
          props: { documentId: 'notion:missing', title: '📚 Notes' },
        },
        {
          type: 'pageLink',
          props: { documentId: '', title: '' },
        },
      ],
      {
        resolvePageLink: () => null,
        flattenUnresolvedPageLinks: true,
      },
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: '📚 Notes' }],
    });
    expect(warnings).toEqual([
      { kind: 'page-link-unmapped', element: 'pageLink' },
      { kind: 'page-link-unmapped', element: 'pageLink' },
    ]);
  });

  it('keeps real workspace record chips untouched by placeholder handling', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'mention',
          props: { recordId: 'record-1', objectNameSingular: 'document' },
        },
      ],
      {
        resolvePageLink: () => null,
        flattenUnresolvedPageLinks: true,
      },
    );

    expect(blocks[0]).toMatchObject({ type: 'mention' });
    expect(warnings).toEqual([]);
  });

  it('resolves and flattens relation chips the same way as page links', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [
        {
          type: 'table',
          content: {
            type: 'tableContent',
            rows: [
              {
                cells: [
                  [
                    {
                      type: 'mention',
                      props: {
                        recordId: 'notion:abc',
                        objectNameSingular: 'document',
                        label: '📚 Child',
                      },
                    },
                    {
                      type: 'mention',
                      props: {
                        recordId: 'notion:gone',
                        objectNameSingular: 'document',
                        label: 'Removed page',
                      },
                    },
                  ],
                ],
              },
            ],
          },
        },
      ],
      {
        resolvePageLink: (target) =>
          target === 'notion:abc' ? 'record-9' : null,
        flattenUnresolvedPageLinks: true,
      },
    );
    const serialized = JSON.stringify(blocks);
    expect(serialized).toContain('"record-9"');
    expect(serialized).toContain('Removed page');
    // Unresolved placeholders must not survive as dead chips.
    expect(serialized).not.toContain('"notion:');
    expect(warnings).toEqual([
      { kind: 'mention-unmapped', element: 'mention' },
    ]);
  });
});
