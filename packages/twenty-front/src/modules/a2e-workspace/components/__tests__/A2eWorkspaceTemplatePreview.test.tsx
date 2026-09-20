import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { A2eWorkspaceTemplatePreview } from '@/a2e-workspace/components/A2eWorkspaceTemplatePreview';
import { useApplyWorkspaceTemplateOperation } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation';
import { useWorkspaceTemplatePreview } from '@/a2e-workspace/hooks/useWorkspaceTemplatePreview';
import {
  type ApplyTemplateErrorCode,
  type ApplyTemplateResult,
  type ApplyTemplateStep,
  type TemplatePreview,
  type TemplatePreviewApp,
} from '@/a2e-workspace/types/apply-template-operation.types';
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

const mockApplyTemplateOperation = jest.fn();
const mockResetOperation = jest.fn();
const mockRefetchPreview = jest.fn();

const buildApp = (
  overrides: Partial<TemplatePreviewApp> = {},
): TemplatePreviewApp => ({
  universalIdentifier: 'app-documents',
  displayName: 'A2E Documents',
  registered: true,
  versionCompatible: true,
  required: true,
  currentlyInstalled: false,
  ...overrides,
});

const buildPreview = (
  overrides: Partial<TemplatePreview> = {},
): TemplatePreview => ({
  templateKey: 'INDIVIDUAL',
  version: 1,
  apps: [
    buildApp({
      universalIdentifier: 'app-documents',
      displayName: 'A2E Documents',
    }),
    buildApp({
      universalIdentifier: 'app-accounting',
      displayName: 'A2E Accounting',
      required: false,
    }),
    buildApp({
      universalIdentifier: 'app-projects',
      displayName: 'A2E Projects',
      required: false,
      currentlyInstalled: true,
    }),
  ],
  navigationChanges: [
    { universalIdentifier: 'nav-people', action: 'hide' },
    { universalIdentifier: 'nav-notes', action: 'restore' },
  ],
  samples: [{ label: 'Welcome note', locale: 'en' }],
  blockedSamples: [],
  blocked: false,
  ...overrides,
});

const buildStep = (
  overrides: Partial<ApplyTemplateStep> = {},
): ApplyTemplateStep => ({
  kind: 'INSTALL_APP',
  targetUniversalIdentifier: 'app-documents',
  status: 'SUCCEEDED',
  ...overrides,
});

const buildPartialResult = (
  overrides: Partial<ApplyTemplateResult> = {},
): ApplyTemplateResult => ({
  operationId: 'op-1',
  requestedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
  appliedTemplateKeyVersion: null,
  steps: [
    buildStep({ status: 'SUCCEEDED' }),
    buildStep({
      status: 'FAILED',
      errorCode: 'INSTALL_FAILED',
      localizedMessage: 'install boom',
    }),
    buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SKIPPED' }),
  ],
  ...overrides,
});

const setupHooks = (
  preview: TemplatePreview | null,
  operationResult: ApplyTemplateResult | null = null,
  previewError?: unknown,
  operationErrorCode: ApplyTemplateErrorCode | null = null,
) => {
  mockedUseWorkspaceTemplatePreview.mockReturnValue({
    preview,
    isLoading: false,
    error: previewError,
    refetch: mockRefetchPreview,
  } as unknown as ReturnType<typeof useWorkspaceTemplatePreview>);
  mockedUseApplyWorkspaceTemplateOperation.mockReturnValue({
    applyTemplateOperation: mockApplyTemplateOperation,
    resetOperation: mockResetOperation,
    operationResult,
    operationErrorCode,
    idempotencyKey: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useApplyWorkspaceTemplateOperation>);
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

// jsdom ships no PointerEvent constructor and the base-ui checkbox constructs
// one on click.
const originalPointerEvent = window.PointerEvent;

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  });
});

afterAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: originalPointerEvent,
  });
});

describe('A2eWorkspaceTemplatePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyTemplateOperation.mockResolvedValue(null);
  });

  it('renders the resolved install/keep/unavailable state of every app', () => {
    setupHooks(buildPreview());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(screen.getAllByText('will install')).toHaveLength(2);
    expect(screen.getByText('already installed')).toBeInTheDocument();
    expect(screen.queryByText('unavailable')).not.toBeInTheDocument();
  });

  it('shows an unavailable required app as a blocking prerequisite', () => {
    setupHooks(
      buildPreview({
        apps: [
          buildApp({ universalIdentifier: 'app-documents' }),
          buildApp({
            universalIdentifier: 'app-missing',
            displayName: 'Missing App',
            required: true,
            registered: false,
          }),
        ],
        blocked: true,
      }),
    );

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('not registered on this server'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('a2e-workspace-template-preview-prerequisites'),
    ).toHaveTextContent('Required prerequisite unavailable: Missing App');
    expect(
      screen.getByRole('button', { name: 'Apply template' }),
    ).toBeDisabled();
  });

  it('previews the navigation customization and sample contents', () => {
    setupHooks(buildPreview());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    const navigation = screen.getByTestId(
      'a2e-workspace-template-preview-navigation',
    );
    expect(navigation).toHaveTextContent('Hide nav-people');
    expect(navigation).toHaveTextContent('Restore nav-notes');
    expect(
      screen.getByRole('checkbox', { name: 'Include sample content' }),
    ).toBeInTheDocument();
  });

  it('renders deferred bundle contents as blocked instead of dropping them', () => {
    setupHooks(
      buildPreview({
        blockedSamples: [
          { label: 'Dons', locale: 'fr', blockedBy: 'P7.0_SAFETY_GATE' },
        ],
      }),
    );

    render(<A2eWorkspaceTemplatePreview template="NON_PROFIT" />, {
      wrapper: Wrapper,
    });

    const blockedContents = screen.getByTestId(
      'a2e-workspace-template-preview-blocked-contents',
    );
    expect(blockedContents).toHaveTextContent(
      'Dons — blocked until the Bilan safety gate (P7.0) clears',
    );
  });

  it('offers an include toggle only for optional apps that are not installed', () => {
    setupHooks(buildPreview());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('checkbox', { name: 'Include A2E Accounting' }),
    ).toBeChecked();
    expect(
      screen.queryByRole('checkbox', { name: 'Include A2E Projects' }),
    ).not.toBeInTheDocument();
  });

  it('sends the excluded optional app to the shared setup operation', async () => {
    const user = userEvent.setup();
    setupHooks(buildPreview());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    await user.click(
      screen.getByRole('checkbox', { name: 'Include A2E Accounting' }),
    );
    await user.click(screen.getByRole('button', { name: 'Apply template' }));

    expect(mockApplyTemplateOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'INDIVIDUAL',
        templateVersion: 1,
        deselectedOptionalAppUniversalIdentifiers: ['app-accounting'],
        sampleContentEnabled: false,
      }),
    );
  });

  it('shows each step status truthfully from the operation result', () => {
    setupHooks(
      buildPreview(),
      buildPartialResult({
        steps: [
          buildStep({ status: 'SUCCEEDED' }),
          buildStep({
            status: 'FAILED',
            errorCode: 'INSTALL_FAILED',
            localizedMessage: 'install boom',
          }),
          buildStep({ kind: 'SEED_SAMPLES', status: 'SKIPPED' }),
          buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SKIPPED' }),
        ],
      }),
    );

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    const steps = screen.getByTestId('a2e-workspace-template-preview-steps');
    expect(steps).toHaveTextContent('succeeded');
    expect(steps).toHaveTextContent('failed');
    expect(steps).toHaveTextContent('skipped');
    expect(steps).not.toHaveTextContent('pending');
    expect(steps).not.toHaveTextContent('in progress');
  });

  it('reports a partial failure without claiming the whole preset applied', () => {
    setupHooks(buildPreview(), buildPartialResult());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    const outcome = screen.getByTestId(
      'a2e-workspace-template-preview-operation-outcome',
    );
    expect(outcome).toHaveTextContent('Some steps failed');
    expect(outcome).not.toHaveTextContent('applied');
    expect(screen.getByText('install boom')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry remaining steps' }),
    ).toBeInTheDocument();
  });

  it('retries the same operation and keeps the partial result until it succeeds', async () => {
    const user = userEvent.setup();
    // Still partial on the retry: the hook keeps its result and its
    // idempotency key, so the button must stay a retry, not a fresh apply.
    mockApplyTemplateOperation.mockResolvedValue(buildPartialResult());
    setupHooks(buildPreview(), buildPartialResult());

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    await user.click(
      screen.getByRole('button', { name: 'Retry remaining steps' }),
    );

    expect(mockApplyTemplateOperation).toHaveBeenCalledTimes(1);
    expect(mockResetOperation).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Retry remaining steps' }),
    ).toBeInTheDocument();
  });

  it('resets the operation and notifies the caller only when fully applied', async () => {
    const user = userEvent.setup();
    const onApplied = jest.fn();
    mockApplyTemplateOperation.mockResolvedValue({
      operationId: 'op-2',
      requestedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
      appliedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
      steps: [
        buildStep({ status: 'SUCCEEDED' }),
        buildStep({ kind: 'SEED_SAMPLES', status: 'SKIPPED' }),
        buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SUCCEEDED' }),
      ],
    } satisfies ApplyTemplateResult);
    setupHooks(buildPreview());

    render(
      <A2eWorkspaceTemplatePreview
        template="INDIVIDUAL"
        onApplied={onApplied}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Apply template' }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(mockResetOperation).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('a2e-workspace-template-preview-operation-outcome'),
    ).not.toBeInTheDocument();
  });

  it('renders a distinct permission-denied panel and keeps the template choice', () => {
    setupHooks(null, null, {
      extensions: { code: 'FORBIDDEN' },
    });

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByTestId('a2e-workspace-template-preview-permission-denied'),
    ).toHaveTextContent('Your template choice is kept');
    expect(
      screen.queryByTestId('a2e-workspace-template-preview-network-error'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Apply template' }),
    ).toBeDisabled();
  });

  it('renders a distinct network-error panel with a preview retry', async () => {
    const user = userEvent.setup();
    setupHooks(null, null, { networkError: new Error('offline') });

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByTestId('a2e-workspace-template-preview-network-error'),
    ).toHaveTextContent('Your template choice is kept');
    expect(
      screen.getByRole('button', { name: 'Apply template' }),
    ).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Retry preview' }));

    expect(mockRefetchPreview).toHaveBeenCalledTimes(1);
  });

  it('renders a distinct no-apps-available panel from the server discriminator', () => {
    setupHooks(buildPreview({ errorCode: 'NO_APPS_AVAILABLE', blocked: true }));

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByTestId('a2e-workspace-template-preview-no-apps-available'),
    ).toHaveTextContent('No apps are available');
    // A blocked no-apps preview keeps the choice but cannot apply.
    expect(
      screen.getByRole('button', { name: 'Apply template' }),
    ).toBeDisabled();
  });

  it('renders a distinct apply-error banner for a permission denial and keeps the choice', () => {
    setupHooks(buildPreview(), null, undefined, 'PERMISSION_DENIED');

    render(<A2eWorkspaceTemplatePreview template="INDIVIDUAL" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByTestId('a2e-workspace-template-preview-operation-error'),
    ).toHaveTextContent('do not have permission');
    expect(
      screen.getByRole('button', { name: 'Apply template' }),
    ).toBeEnabled();
  });
});
