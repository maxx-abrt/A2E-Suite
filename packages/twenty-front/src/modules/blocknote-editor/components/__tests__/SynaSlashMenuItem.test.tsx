import { render } from '@testing-library/react';

import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import { SynaSlashMenuItem } from '@/blocknote-editor/components/SynaSlashMenuItem';
import { type SuggestionItem } from '@/blocknote-editor/types/types';

const mockUseContextToolButtons = jest.fn();
const mockOpenAskAiPageWithPreprompt = jest.fn();
const mockUseWorkspaceAiModelAvailability = jest.fn();
const mockUseHasPermissionFlag = jest.fn();

jest.mock('@/ai/hooks/useContextToolButtons', () => ({
  useContextToolButtons: () => mockUseContextToolButtons(),
}));

jest.mock('@/ai/hooks/useOpenAskAiPageWithPreprompt', () => ({
  useOpenAskAiPageWithPreprompt: () => ({
    openAskAiPageWithPreprompt: mockOpenAskAiPageWithPreprompt,
  }),
}));

jest.mock('@/ai/hooks/useWorkspaceAiModelAvailability', () => ({
  useWorkspaceAiModelAvailability: () => mockUseWorkspaceAiModelAvailability(),
}));

jest.mock('@/settings/roles/hooks/useHasPermissionFlag', () => ({
  useHasPermissionFlag: () => mockUseHasPermissionFlag(),
}));

const summarizeTool = {
  toolName: 'app_summarize_document',
} as ContextToolButton;

const renderItems = (): SuggestionItem[] => {
  let capturedItems: SuggestionItem[] = [];

  render(
    <SynaSlashMenuItem>
      {(items) => {
        capturedItems = items;

        return <span />;
      }}
    </SynaSlashMenuItem>,
  );

  return capturedItems;
};

describe('SynaSlashMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasPermissionFlag.mockReturnValue(true);
    mockUseWorkspaceAiModelAvailability.mockReturnValue({
      enabledModels: [{ modelId: 'gpt-4o' }],
    });
    mockUseContextToolButtons.mockReturnValue([summarizeTool]);
  });

  it('offers no entry when the AI permission flag is missing', () => {
    mockUseHasPermissionFlag.mockReturnValue(false);

    expect(renderItems()).toEqual([]);
  });

  it('offers no entry when no model is available (zero-AI mode)', () => {
    mockUseWorkspaceAiModelAvailability.mockReturnValue({
      enabledModels: [],
    });

    expect(renderItems()).toEqual([]);
  });

  it('offers no entry when the backing document tool is absent from context', () => {
    mockUseContextToolButtons.mockReturnValue([]);

    expect(renderItems()).toEqual([]);
  });

  it('offers the document action in the Syna slash group once its tool is available', () => {
    const items = renderItems();

    expect(items.map((item) => item.title)).toEqual(['Summarize']);
    expect(items[0].groupKey).toBe('syna');
    expect(items[0].aliases).toEqual(expect.arrayContaining(['résumé']));
  });

  it('stages a PREFILL draft instead of executing directly', () => {
    const items = renderItems();

    items[0].onItemClick();

    expect(mockOpenAskAiPageWithPreprompt).toHaveBeenCalledWith({
      text: 'Summarize this document.',
      mode: 'PREFILL',
    });
  });
});
