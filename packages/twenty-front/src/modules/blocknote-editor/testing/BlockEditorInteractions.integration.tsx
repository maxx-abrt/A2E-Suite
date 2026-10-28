// Native ESM keeps BlockNote/Tiptap export interop intact.
import { jest } from '@jest/globals';
import { SideMenuExtension } from '@blocknote/core/extensions';
import { Provider, createStore, useAtomValue } from 'jotai';
import { focusStackState } from '@/ui/utilities/focus/states/focusStackState';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { BlockNoteSchema } from '@blocknote/core';
import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { type ReactNode } from 'react';
import { FormattingToolbarController } from '@blocknote/react';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.unstable_mockModule('@/mention/hooks/useMentionMenu', () => ({
  useMentionMenu: () => async () => [],
}));
jest.unstable_mockModule(
  '@/blocknote-editor/hooks/useDateReminderSlashMenuItem',
  () => ({
    useDateReminderSlashMenuItem: () => ({
      title: 'Reminder',
      onItemClick: () => {},
    }),
  }),
);
jest.unstable_mockModule(
  '@/blocknote-editor/components/SynaFormattingToolbar',
  () => ({
    SynaFormattingToolbar: () => <FormattingToolbarController />,
  }),
);
for (const component of ['SynaSlashMenuItem', 'LinkToRecordSlashMenuItem']) {
  jest.unstable_mockModule(
    `@/blocknote-editor/components/${component}`,
    () => ({
      [component]: ({
        children,
      }: {
        children: (items: unknown) => ReactNode;
      }) =>
        children(
          component === 'SynaSlashMenuItem'
            ? []
            : { title: 'Record', onItemClick: () => {} },
        ),
    }),
  );
}
for (const [path, name] of [
  ['export/components/BlockEditorExportMenu', 'BlockEditorExportMenu'],
  [
    'version-history/components/BlockEditorVersionHistoryPanel',
    'BlockEditorVersionHistoryPanel',
  ],
]) {
  jest.unstable_mockModule(`@/blocknote-editor/${path}`, () => ({
    [name]: () => null,
  }));
}
jest.unstable_mockModule(
  '@/blocknote-editor/co-editing/hooks/useDocumentCursors',
  () => ({
    useDocumentCursors: () => ({ remoteCursors: [], publishCursor: () => {} }),
  }),
);
const mockUpdateOneRecord = jest.fn(async () => ({}));
const mockResolveUsers = async () => [];
const mockSyncAttachments = async () => {};
jest.unstable_mockModule('@/blocknote-editor/blocks/Schema', () => ({
  BLOCK_SCHEMA: BlockNoteSchema.create(),
}));
jest.unstable_mockModule(
  '@/blocknote-editor/comments/hooks/useResolveCommentUsers',
  () => ({ useResolveCommentUsers: () => mockResolveUsers }),
);
jest.unstable_mockModule(
  '@/blocknote-editor/comments/hooks/useDocumentCommentThreadPersistence',
  () => ({
    useDocumentCommentThreadPersistence: () => ({
      loadThreads: async () => [],
      saveThread: async () => {},
      deleteThread: async () => {},
    }),
  }),
);
jest.unstable_mockModule(
  '@/blocknote-editor/version-history/hooks/useDocumentRevisionPersistence',
  () => ({ useDocumentRevisionPersistence: () => undefined }),
);
jest.unstable_mockModule(
  '@/object-metadata/hooks/useObjectMetadataItem',
  () => ({
    useObjectMetadataItem: () => ({
      objectMetadataItem: {
        id: 'document',
        fields: [{ name: 'content', id: 'content' }],
      },
    }),
  }),
);
jest.unstable_mockModule('@/object-metadata/hooks/useApolloCoreClient', () => ({
  useApolloCoreClient: () => ({ cache: {} }),
}));
jest.unstable_mockModule('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({ records: [] }),
}));
jest.unstable_mockModule('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: mockUpdateOneRecord }),
}));
jest.unstable_mockModule(
  '@/object-record/read-only/hooks/useIsRecordFieldReadOnly',
  () => ({ useIsRecordFieldReadOnly: () => false }),
);
jest.unstable_mockModule(
  '@/object-record/cache/utils/modifyRecordFromCache',
  () => ({ modifyRecordFromCache: () => {} }),
);
jest.unstable_mockModule(
  '@/activities/files/hooks/useUploadAttachmentFile',
  () => ({
    useUploadAttachmentFile: () => ({
      uploadAttachmentFile: async () => ({ attachmentAbsoluteURL: '' }),
    }),
  }),
);
jest.unstable_mockModule('@/blocknote-editor/hooks/useAttachmentSync', () => ({
  useAttachmentSync: () => ({ syncAttachments: mockSyncAttachments }),
}));
jest.unstable_mockModule(
  '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement',
  () => ({ useHotkeysOnFocusedElement: () => {} }),
);
const { RichTextFieldEditor } =
  await import('@/object-record/record-field/ui/meta-types/input/components/RichTextFieldEditor');

beforeAll(() => {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  Range.prototype.getClientRects = () =>
    Object.assign([], { item: () => null });
  document.elementsFromPoint = () => [
    ...document.querySelectorAll('.bn-block-content'),
  ];
  document.elementFromPoint = () =>
    document.querySelector('.bn-inline-content');
  HTMLElement.prototype.scrollIntoView = () => {};
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: () => true,
  });
});

type DocumentEditorProps = {
  editorRef?: NonNullable<
    Parameters<typeof RichTextFieldEditor>[0]['editorRef']
  >;
  isReadOnly?: boolean;
};

const DocumentEditor = ({ editorRef, isReadOnly }: DocumentEditorProps) => {
  const focusStack = useAtomValue(focusStackState.atom);

  return (
    <I18nProvider i18n={i18n}>
      <div data-focused={focusStack.length}>
        <RichTextFieldEditor
          recordId="document-1"
          objectNameSingular="document"
          fieldName="content"
          editorRef={editorRef}
          isReadOnly={isReadOnly}
        />
      </div>
    </I18nProvider>
  );
};

const createDocumentStore = (text: string) => {
  const store = createStore();

  store.set(recordStoreFamilyState.atomFamily('document-1'), {
    id: 'document-1',
    __typename: 'Document',
    content: {
      blocknote: JSON.stringify([
        { id: 'first-block', type: 'paragraph', content: text },
      ]),
      markdown: null,
    },
  });

  return store;
};

beforeEach(() => {
  jest.clearAllMocks();
});

it.each(['', 'Existing writing'])(
  'keeps floating controls mounted when focusing and editing a document containing "%s"',
  async (initialText) => {
    const user = userEvent.setup();
    const store = createDocumentStore(initialText);
    const editorRef = {
      current: null as typeof BLOCK_SCHEMA.BlockNoteEditor | null,
    };
    const { unmount } = render(
      <Provider store={store}>
        <DocumentEditor editorRef={editorRef} />
      </Provider>,
    );
    const body = screen.getByRole('textbox');

    act(() => {
      const editor = editorRef.current;
      editor?.getExtension(SideMenuExtension)?.store.setState({
        show: true,
        referencePos: new DOMRect(),
        block: editor.document[0],
      });
    });
    const dragHandle = await screen.findByRole('button', {
      name: 'Open block menu',
    });

    await user.click(body);
    expect(screen.getByRole('button', { name: 'Open block menu' })).toBe(
      dragHandle,
    );
    await user.keyboard(' more text');
    expect(body).toHaveTextContent('more text');

    unmount();

    expect(mockUpdateOneRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        idToUpdate: 'document-1',
        objectNameSingular: 'document',
        updateOneRecordInput: expect.objectContaining({
          content: expect.objectContaining({
            blocknote: expect.stringContaining('more text'),
          }),
        }),
      }),
    );

    const reopened = render(
      <Provider store={store}>
        <DocumentEditor />
      </Provider>,
    );
    expect(screen.getByRole('textbox')).toHaveTextContent('more text');
    reopened.unmount();
  },
);

it('preserves locked document content without scheduling a save', async () => {
  const user = userEvent.setup();
  const store = createDocumentStore('Locked writing');
  const { unmount } = render(
    <Provider store={store}>
      <DocumentEditor isReadOnly />
    </Provider>,
  );
  const body = screen.getByRole('textbox');

  expect(body).toHaveAttribute('contenteditable', 'false');
  await user.click(body);
  await user.keyboard(' should not be added');
  expect(body).toHaveTextContent('Locked writing');
  expect(body).not.toHaveTextContent('should not be added');
  unmount();
  expect(mockUpdateOneRecord).not.toHaveBeenCalled();
});
