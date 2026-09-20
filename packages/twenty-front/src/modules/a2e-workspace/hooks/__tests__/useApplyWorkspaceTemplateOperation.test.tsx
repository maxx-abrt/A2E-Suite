import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';
import { GraphQLError } from 'graphql';
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
  kind: 'INSTALL_APP',
  targetUniversalIdentifier: 'documents',
  status,
  errorCode: status === 'FAILED' ? 'INSTALL_FAILED' : null,
  localizedMessage: status === 'FAILED' ? 'install boom' : null,
});

const buildMock = (
  variables: Record<string, unknown>,
  operation: {
    appliedTemplateKeyVersion: { key: string; version: number } | null;
    steps: ReturnType<typeof buildStep>[];
  } = {
    appliedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
    steps: [buildStep('SUCCEEDED'), buildStep('SUCCEEDED')],
  },
): MockedResponse => ({
  request: {
    query: APPLY_WORKSPACE_TEMPLATE_OPERATION,
    variables,
  },
  result: {
    data: {
      applyWorkspaceTemplateOperation: {
        operationId: 'op-1',
        requestedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
        appliedTemplateKeyVersion: operation.appliedTemplateKeyVersion,
        steps: operation.steps,
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
    expect(result.current.operationErrorCode).toBe('NETWORK_ERROR');

    expect(firstKey).toBe(OPERATION_IDEMPOTENCY_KEY);

    await act(async () => {
      await result.current.applyTemplateOperation({ template: 'INDIVIDUAL' });
    });

    expect(result.current.idempotencyKey).toBe(firstKey);
    expect(result.current.operationErrorCode).toBeNull();
    expect(mockEnqueueSuccessSnackBar).toHaveBeenCalledTimes(1);
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
  });

  it('reports a permission denial as its own error code', async () => {
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
        result: {
          errors: [
            new GraphQLError('Forbidden', {
              extensions: { code: 'FORBIDDEN' },
            }),
          ],
        },
      },
    ]);

    await act(async () => {
      await result.current.applyTemplateOperation({ template: 'INDIVIDUAL' });
    });

    expect(result.current.operationErrorCode).toBe('PERMISSION_DENIED');
  });

  it('never reports success on a partial result and returns it for retry', async () => {
    const variables = {
      input: {
        idempotencyKey: OPERATION_IDEMPOTENCY_KEY,
        template: 'INDIVIDUAL',
      },
    };

    const { result } = renderOperationHook([
      buildMock(variables, {
        appliedTemplateKeyVersion: null,
        steps: [buildStep('SUCCEEDED'), buildStep('FAILED')],
      }),
    ]);

    let returned: { steps: unknown[] } | null = null;

    await act(async () => {
      returned = await result.current.applyTemplateOperation({
        template: 'INDIVIDUAL',
      });
    });

    expect(mockEnqueueSuccessSnackBar).not.toHaveBeenCalled();
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
    expect(returned).toMatchObject({ operationId: 'op-1' });
    expect(result.current.operationResult).toMatchObject({
      appliedTemplateKeyVersion: null,
    });
    // The key survives, so the next call resumes the same server operation.
    expect(result.current.idempotencyKey).toBe(OPERATION_IDEMPOTENCY_KEY);
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
