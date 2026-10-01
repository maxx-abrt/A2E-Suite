import {
  planBureauImport,
  planBureauMarkdownFileImport,
} from '@/blocknote-editor/import/utils/bureauImportPlan';
import {
  readNotionExportZip,
  type NotionExportTree,
} from '@/blocknote-editor/import/utils/notionExportZip';

const encoder = new TextEncoder();

const tree: NotionExportTree = readNotionExportZip([
  {
    path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md',
    bytes: encoder.encode('# Parent'),
  },
  {
    path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Child bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.md',
    bytes: encoder.encode('- child'),
  },
]);

describe('planBureauImport', () => {
  it('flattens the tree and links children to their created parent', () => {
    const result = planBureauImport({
      tree,
      parentId: 'chosen-parent',
      canCreateInParent: () => true,
    });

    if (result.status !== 'planned') {
      throw new Error(`expected a plan, got ${result.status}`);
    }

    expect(result.parentId).toBe('chosen-parent');
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].title).toBe('Parent');
    expect(result.nodes[0].parentIndex).toBeNull();
    expect(result.nodes[0].blocks[0].type).toBe('heading');
    expect(result.nodes[1].title).toBe('Child');
    expect(result.nodes[1].parentIndex).toBe(0);
    expect(result.nodes[1].blocks[0].type).toBe('bulletListItem');
  });

  it('treats a plain markdown file as a single-page plan with a file-name title', () => {
    const result = planBureauMarkdownFileImport({
      fileName: 'Meeting notes.md',
      markdown: '## Agenda\n\n- item one',
      parentId: 'chosen-parent',
      canCreateInParent: () => true,
    });

    if (result.status !== 'planned') {
      throw new Error(`expected a plan, got ${result.status}`);
    }

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].title).toBe('Meeting notes');
    expect(result.nodes[0].parentIndex).toBeNull();
    expect(result.nodes[0].blocks.map((block) => block.type)).toEqual([
      'heading',
      'bulletListItem',
    ]);
  });

  it('strips a Notion hash suffix from the markdown file-name title', () => {
    const result = planBureauMarkdownFileImport({
      fileName: 'Roadmap aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md',
      markdown: 'body',
      parentId: null,
      canCreateInParent: () => true,
    });

    if (result.status !== 'planned') {
      throw new Error(`expected a plan, got ${result.status}`);
    }

    expect(result.nodes[0].title).toBe('Roadmap');
  });

  it('surfaces a typed error when create is denied', () => {
    const result = planBureauImport({
      tree,
      parentId: null,
      canCreateInParent: () => false,
    });

    expect(result.status).toBe('denied');

    if (result.status !== 'denied') {
      throw new Error('expected denial');
    }

    expect(result.error.name).toBe('BureauImportPermissionError');
    expect(result.error.reason).toBe('create-not-permitted');
  });
});
