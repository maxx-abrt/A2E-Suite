import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import { SynaFormattingToolbar } from '@/blocknote-editor/components/SynaFormattingToolbar';

const mockUseContextToolButtons = jest.fn();
const mockOpenAskAiPageWithPreprompt = jest.fn();
const mockUseWorkspaceAiModelAvailability = jest.fn();
const mockUseHasPermissionFlag = jest.fn();
const mockGetSelectedText = jest.fn();

jest.mock('@blocknote/react', () => ({
  FormattingToolbar: ({ children }: { children: ReactNode }) => (
    <div data-testid="formatting-toolbar">{children}</div>
  ),
  FormattingToolbarController: ({
    formattingToolbar: FormattingToolbarComponent,
  }: {
    formattingToolbar: () => ReactNode;
  }) => <FormattingToolbarComponent />,
  getFormattingToolbarItems: () => [
    <button key="boldStyleButton">Bold</button>,
  ],
  useBlockNoteEditor: () => ({ getSelectedText: mockGetSelectedText }),
  useComponentsContext: () => ({
    FormattingToolbar: {
      Button: ({ label, onClick }: { label: string; onClick: () => void }) => (
        <button onClick={onClick}>{label}</button>
      ),
    },
  }),
}));

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

describe('SynaFormattingToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasPermissionFlag.mockReturnValue(true);
    mockUseWorkspaceAiModelAvailability.mockReturnValue({
      hasConfiguredAiProvider: true,
    });
    mockUseContextToolButtons.mockReturnValue([summarizeTool]);
    mockGetSelectedText.mockReturnValue('Le passage sélectionné');
  });

  it('renders the default toolbar items plus the Syna items when gated in', () => {
    render(<SynaFormattingToolbar />);

    expect(screen.getByText('Bold')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeDefined();
  });

  it('renders only the default items when the AI permission flag is missing', () => {
    mockUseHasPermissionFlag.mockReturnValue(false);

    render(<SynaFormattingToolbar />);

    expect(screen.getByText('Bold')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Summarize' })).toBeNull();
  });

  it('renders only the default items when no provider is configured (zero-AI mode)', () => {
    mockUseWorkspaceAiModelAvailability.mockReturnValue({
      hasConfiguredAiProvider: false,
    });

    render(<SynaFormattingToolbar />);

    expect(screen.getByText('Bold')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Summarize' })).toBeNull();
  });

  it('omits a Syna item whose backing tool is absent from context', () => {
    mockUseContextToolButtons.mockReturnValue([]);

    render(<SynaFormattingToolbar />);

    expect(screen.queryByRole('button', { name: 'Summarize' })).toBeNull();
  });

  it('stages a PREFILL draft quoting the selection instead of executing', () => {
    render(<SynaFormattingToolbar />);

    screen.getByRole('button', { name: 'Summarize' }).click();

    expect(mockOpenAskAiPageWithPreprompt).toHaveBeenCalledWith({
      text: expect.stringContaining('Le passage sélectionné'),
      mode: 'PREFILL',
    });
  });
});
