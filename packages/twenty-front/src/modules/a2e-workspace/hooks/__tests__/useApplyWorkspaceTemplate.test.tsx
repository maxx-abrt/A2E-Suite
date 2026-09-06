import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

import { APPLY_WORKSPACE_TEMPLATE } from '@/a2e-workspace/graphql/mutations/applyWorkspaceTemplate';
import { useApplyWorkspaceTemplate } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplate';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

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

const buildSuccessMock = (): MockedResponse => ({
  request: {
    query: APPLY_WORKSPACE_TEMPLATE,
    variables: { input: { template: 'INDIVIDUAL' } },
  },
  result: {
    data: {
      applyWorkspaceTemplate: {
        success: true,
        __typename: 'OnboardingStepSuccess',
      },
    },
  },
});

const buildErrorMock = (): MockedResponse => ({
  request: {
    query: APPLY_WORKSPACE_TEMPLATE,
    variables: { input: { template: 'INDIVIDUAL' } },
  },
  error: new Error('server error'),
});

const renderApplyHook = (mocks: readonly MockedResponse[]) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </MockedProvider>
  );

  return renderHook(() => useApplyWorkspaceTemplate(), { wrapper });
};

describe('useApplyWorkspaceTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies a template and reports success', async () => {
    const { result } = renderApplyHook([buildSuccessMock()]);

    await act(async () => {
      await result.current.applyWorkspaceTemplate('INDIVIDUAL');
    });

    expect(mockEnqueueSuccessSnackBar).toHaveBeenCalledTimes(1);
    expect(result.current.appliedTemplate).toBe('INDIVIDUAL');
  });

  it('reports an error and leaves the applied template untouched on failure', async () => {
    const { result } = renderApplyHook([buildErrorMock()]);

    await act(async () => {
      await result.current.applyWorkspaceTemplate('INDIVIDUAL');
    });

    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
    expect(result.current.appliedTemplate).toBeNull();
  });
});
