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

  it('drops unmapped attachments and warns', () => {
    const { blocks, warnings } = mapImportedAttachmentsAndLinks(
      [image('https://external.example/a.png'), paragraph('keep')],
      { resolveAttachmentUrl: () => null },
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
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
});
