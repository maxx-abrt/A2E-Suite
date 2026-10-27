import { BureauImportPagePreview } from '@/bureau/components/BureauImportPagePreview';
import { planBureauArchiveImport } from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

const mockParseHtml = jest.fn();
jest.mock('@/blocknote-editor/blocks/Schema', () => ({ BLOCK_SCHEMA: {} }));
jest.mock('@/blocknote-editor/import/adapters/parseHtmlWithBlockNote', () => ({
  parseHtmlWithBlockNote: (html: string) => mockParseHtml(html),
  parseMarkdownWithBlockNote: (markdown: string) => mockParseHtml(markdown),
}));
jest.mock('@blocknote/react', () => ({
  useCreateBlockNote: ({ initialContent }: { initialContent: unknown[] }) => ({
    document: initialContent,
  }),
}));
jest.mock('@blocknote/mantine', () => ({
  BlockNoteView: ({
    editor,
  }: {
    editor: { document: { type: string; props: { url: string } }[] };
  }) => (
    <div>
      {editor.document
        .filter((block) => block.type === 'image')
        .map((block, index) => (
          <img key={index} src={block.props.url} alt="Exported photo" />
        ))}
    </div>
  ),
}));

const entry = (path: string, content: string) => ({
  path,
  bytes: new TextEncoder().encode(content),
});
const renderPreview = () => {
  const plan = planBureauArchiveImport([
    entry('Home.html', '<p>Home</p>'),
    entry('photo.png', 'image bytes'),
  ]);
  return render(
    <I18nProvider i18n={i18n}>
      <BureauImportPagePreview page={plan.pages[0]} plan={plan} />
    </I18nProvider>,
  );
};

describe('local export preview', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  beforeEach(() => {
    i18n.load('en', {});
    i18n.activate('en');
    URL.createObjectURL = jest
      .fn()
      .mockReturnValue('blob:http://localhost/preview-photo');
    URL.revokeObjectURL = jest.fn();
    mockParseHtml.mockReturnValue([
      { type: 'image', props: { url: 'photo.png' } },
    ]);
  });
  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('displays local media without uploading and releases preview resources on close', async () => {
    const { unmount } = renderPreview();
    expect(
      await screen.findByRole('img', { name: 'Exported photo' }),
    ).toHaveAttribute('src', 'blob:http://localhost/preview-photo');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:http://localhost/preview-photo',
    );
  });

  it('reports a missing local image instead of loading an application URL', async () => {
    mockParseHtml.mockReturnValue([
      { type: 'image', props: { url: 'missing.png' } },
    ]);
    renderPreview();
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1 items on this page need review.',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('contains conversion failures inside the preview', async () => {
    mockParseHtml.mockImplementationOnce(() => {
      throw new Error('Invalid page');
    });
    renderPreview();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page could not be previewed.',
    );
  });
});
