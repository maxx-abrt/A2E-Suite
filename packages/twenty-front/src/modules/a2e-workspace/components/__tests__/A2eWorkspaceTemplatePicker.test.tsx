import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { A2eWorkspaceTemplatePicker } from '@/a2e-workspace/components/A2eWorkspaceTemplatePicker';
import { A2E_WORKSPACE_TEMPLATE_OPTIONS } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { useApplyWorkspaceTemplateOperation } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation';
import { useWorkspaceTemplatePreview } from '@/a2e-workspace/hooks/useWorkspaceTemplatePreview';
import { type TemplatePreview } from '@/a2e-workspace/types/apply-template-operation.types';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@/a2e-workspace/hooks/useWorkspaceTemplatePreview');
jest.mock('@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation');

const mockedUseWorkspaceTemplatePreview = jest.mocked(
  useWorkspaceTemplatePreview,
);
const mockedUseApplyWorkspaceTemplateOperation = jest.mocked(
  useApplyWorkspaceTemplateOperation,
);

const preview: TemplatePreview = {
  templateKey: 'INDIVIDUAL',
  version: 1,
  apps: [
    {
      universalIdentifier: 'app-documents',
      displayName: 'A2E Documents',
      registered: true,
      versionCompatible: true,
      required: true,
      currentlyInstalled: false,
    },
  ],
  navigationChanges: [],
  samples: [],
  blocked: false,
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('A2eWorkspaceTemplatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseWorkspaceTemplatePreview.mockReturnValue({
      preview,
      isLoading: false,
      error: undefined,
    });
    mockedUseApplyWorkspaceTemplateOperation.mockReturnValue({
      applyTemplateOperation: jest.fn(),
      resetOperation: jest.fn(),
      operationResult: null,
      idempotencyKey: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useApplyWorkspaceTemplateOperation>);
  });

  it('renders the single shared preview only after a template is selected', async () => {
    const user = userEvent.setup();

    render(
      <A2eWorkspaceTemplatePicker options={A2E_WORKSPACE_TEMPLATE_OPTIONS} />,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByTestId('a2e-workspace-template-preview'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Individual/ }));

    expect(
      screen.getByTestId('a2e-workspace-template-preview'),
    ).toBeInTheDocument();
  });
});
