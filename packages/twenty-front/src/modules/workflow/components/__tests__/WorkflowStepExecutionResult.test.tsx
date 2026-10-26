import { WorkflowStepExecutionResult } from '@/workflow/components/WorkflowStepExecutionResult';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockCopyToClipboard = jest.fn();

jest.mock('~/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: mockCopyToClipboard }),
}));

jest.mock('twenty-ui/input', () => ({
  ...jest.requireActual('twenty-ui/input'),
  CodeEditor: ({ value, isLoading }: { value: string; isLoading: boolean }) => (
    <textarea
      aria-label="Code output"
      value={isLoading ? '' : value}
      readOnly
    />
  ),
}));

const renderResult = ({
  language = 'plaintext',
  isTesting = false,
}: {
  language?: 'plaintext' | 'json';
  isTesting?: boolean;
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <WorkflowStepExecutionResult
        result="Network connection failed: timeout after 30 seconds"
        language={language}
        isTesting={isTesting}
        status={{
          isError: true,
          isSuccess: false,
          errorMessage: 'Request Failed',
        }}
      />
    </I18nProvider>,
  );

describe('WorkflowStepExecutionResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows plain text immediately in a keyboard accessible output region', async () => {
    const user = userEvent.setup();
    renderResult();

    expect(screen.getByText('Request Failed')).toBeVisible();
    const output = screen.getByRole('region', { name: 'Output' });
    expect(output).toHaveTextContent(
      'Network connection failed: timeout after 30 seconds',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.tab();
    await user.tab();
    expect(output).toHaveFocus();
  });

  it('keeps the full response available to copy', async () => {
    renderResult();
    await userEvent.click(
      screen.getByRole('button', { name: 'Copy to Clipboard' }),
    );

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      'Network connection failed: timeout after 30 seconds',
      expect.any(String),
    );
  });

  it('retains the code editor for structured responses', () => {
    renderResult({ language: 'json' });

    expect(screen.getByRole('textbox', { name: 'Code output' })).toHaveValue(
      'Network connection failed: timeout after 30 seconds',
    );
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows pending feedback instead of a previous plain text error while testing', () => {
    renderResult({ isTesting: true });

    expect(screen.getByText('Processing...')).toBeVisible();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByText('Request Failed')).not.toBeInTheDocument();
  });
});
