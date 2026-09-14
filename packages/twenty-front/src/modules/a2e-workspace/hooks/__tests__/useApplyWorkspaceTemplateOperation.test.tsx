import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

import { APPLY_WORKSPACE_TEMPLATE_OPERATION } from '@/a2e-workspace/graphql/mutations/applyWorkspaceTemplateOperation';
import { useApplyWorkspaceTemplateOperation } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

const mockEnqueueSuccessSnackBar = jest.fn();
const mockEnqueueErrorSnackBar = jest.fn();

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueSuccessSnackBar: mockEnqueueSuccessSnackBar,
    enqueueErrorSnackBar: mockEnqueueErrorSnackBar,
  }),
}));

const OPERATION_IDEMPOTENCY_KEY = 'fixed-uuid';

const buildStep = (status: string) => ({
  kind: 'install-app',
  targetUniversalIdentifier: 'documents',
  status,
  errorCode: status === 'failed' ? 'INSTALL_FAILED' : null,
  localizedMessage: status === 'failed' ? 'install boom' : null,
});

const buildMock = (variables: Record<string, unknown>): MockedResponse => ({
  request: {
    query: APPLY_WORKSPACE_TEMPLATE_OPERATION,
    variables,
  },
  result: {
    data: {
      applyWorkspaceTemplateOperation: {
        operationId: 'op-1',
        requestedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
        appliedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
        steps: [buildStep('succeeded'), buildStep('succeeded')],
        __typename: 'ApplyTemplateResult',
      },
    },
  },
});

const renderOperationHook = (mocks: readonly MockedResponse[]) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </MockedProvider>
  );

  return renderHook(() => useApplyWorkspaceTemplateOperation(), { wrapper });
};

describe('useApplyWorkspaceTemplateOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies a template and returns the per-step result', async () => {
    const { result } = renderOperationHook([
      buildMock({
        input: {
          idempotencyKey: OPERATION_IDEMPOTENCY_KEY,
          template: 'INDIVIDUAL',
          templateVersion: 1,
          deselectedOptionalAppUniversalIdentifiers: ['accounting'],
          sampleContentEnabled: true,
        },
      }),
    ]);

    let returned: unknown;

    await act(async () => {
      returned = await result.current.applyTemplateOperation({
        template: 'INDIVIDUAL',
        templateVersion: 1,
        deselectedOptionalAppUniversalIdentifiers: ['accounting'],
        sampleContentEnabled: true,
      });
    });

    expect(mockEnqueueSuccessSnackBar).toHaveBeenCalledTimes(1);
    expect(returned).toMatchObject({ operationId: 'op-1' });
    expect(result.current.operationResult?.steps).toHaveLength(2);
  });

  it('reuses the same idempotency key across a retry after a failure', async () => {
    const variables = {
      input: {
        idempotencyKey: OPERATION_IDEMPOTENCY_KEY,
        template: 'INDIVIDUAL',
      },
    };

    const { result } = renderOperationHook([
      {
        request: {
          query: APPLY_WORKSPACE_TEMPLATE_OPERATION,
          variables,
        },
        error: new Error('server error'),
      },
      buildMock(variables),
    ]);

    await act(async () => {
      await result.current.applyTemplateOperation({ template: 'INDIVIDUAL' });
    });

    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
    const firstKey = result.current.idempotencyKey;

    expect(firstKey).toBe(OPERATION_IDEMPOTENCY_KEY);

    await act(async () => {
      await result.current.applyTemplateOperation({ template: 'INDIVIDUAL' });
    });

    expect(result.current.idempotencyKey).toBe(firstKey);
    expect(mockEnqueueSuccessSnackBar).toHaveBeenCalledTimes(1);
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
  });

  it('generates a fresh key after resetOperation', async () => {
    const { result } = renderOperationHook([
      buildMock({
        input: { idempotencyKey: OPERATION_IDEMPOTENCY_KEY, template: 'CRM' },
      }),
    ]);

    await act(async () => {
      await result.current.applyTemplateOperation({ template: 'CRM' });
    });

    await act(async () => {
      result.current.resetOperation();
    });

    expect(result.current.idempotencyKey).toBeNull();
    expect(result.current.operationResult).toBeNull();
  });
});
