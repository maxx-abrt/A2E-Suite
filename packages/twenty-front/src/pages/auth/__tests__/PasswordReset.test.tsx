import { MockedProvider } from '@apollo/client/testing/react';
import { type MockedResponse } from '@apollo/client/testing';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { PasswordReset } from '~/pages/auth/PasswordReset';
import {
  currentUserState,
  type CurrentUser,
} from '@/auth/states/currentUserState';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import {
  ValidatePasswordResetTokenDocument,
  UpdatePasswordViaResetTokenDocument,
} from '~/generated-metadata/graphql';

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();
const mockError = jest.fn();

jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: () => mockNavigate,
}));
jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: mockError }),
}));

const token = 'disposable-reset-token';
const password = 'updated-password';
const validationMock: MockedResponse = {
  request: { query: ValidatePasswordResetTokenDocument, variables: { token } },
  result: {
    data: {
      validatePasswordResetToken: {
        __typename: 'User',
        id: 'target-user',
        email: 'target@example.com',
        hasPassword: true,
      },
    },
  },
};

const renderReset = (mocks: MockedResponse[], currentUser?: CurrentUser) => {
  const store = createStore();
  store.set(currentUserState.atom, currentUser ?? null);
  store.set(isCookieAuthActiveState.atom, !!currentUser);
  render(
    <Provider store={store}>
      <MockedProvider mocks={mocks}>
        <MemoryRouter initialEntries={[`/reset/${token}`]}>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <Routes>
                <Route
                  path="/reset/:passwordResetToken"
                  element={<PasswordReset />}
                />
              </Routes>
            </I18nProvider>
          </ThemeProvider>
        </MemoryRouter>
      </MockedProvider>
    </Provider>,
  );
  return store;
};

const enterPassword = async (confirmation = password) => {
  await userEvent.type(await screen.findByLabelText('New password'), password);
  await userEvent.type(screen.getByLabelText('Confirm password'), confirmation);
  await userEvent.click(screen.getByRole('button', { name: 'Save password' }));
};

describe('PasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.load('en', {});
    i18n.activate('en');
  });

  it('shows a useful loading state while checking the reset link', () => {
    renderReset([{ ...validationMock, delay: Infinity }]);
    expect(
      screen.getByRole('heading', { name: 'Checking your reset link' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('One moment');
  });

  it('keeps failed links on a recovery screen instead of redirecting away', async () => {
    renderReset([
      { request: validationMock.request, error: new Error('Link expired') },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'expired or already been used',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('Back to sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('/welcome');
  });

  it('requires matching passwords before updating the account', async () => {
    renderReset([validationMock]);
    await enterPassword('another-password');
    expect(
      await screen.findByText('Passwords do not match'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save password' }),
    ).toBeInTheDocument();
    expect(mockError).not.toHaveBeenCalled();
  });

  it('recovers from an interrupted link check without leaving the reset screen', async () => {
    renderReset([
      {
        request: validationMock.request,
        error: new Error('Connection interrupted'),
      },
      validationMock,
    ]);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows durable success after saving and returns to native sign-in without a second authentication attempt', async () => {
    const updateResult = jest.fn(() => ({
      data: { updatePasswordViaResetToken: { success: true } },
    }));
    renderReset([
      validationMock,
      {
        request: {
          query: UpdatePasswordViaResetTokenDocument,
          variables: { token, newPassword: password },
        },
        result: updateResult,
      },
    ]);
    await enterPassword();
    expect(
      await screen.findByRole('heading', { name: 'Your password is ready' }),
    ).toBeInTheDocument();
    expect(updateResult).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Save password' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Back to sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('/welcome');
  });

  it('does not change another logged-in account when a reset link targets someone else', async () => {
    const otherUser = {
      id: 'other-user',
      email: 'other@example.com',
      hasPassword: false,
    } as CurrentUser;
    const store = renderReset(
      [
        validationMock,
        {
          request: {
            query: UpdatePasswordViaResetTokenDocument,
            variables: { token, newPassword: password },
          },
          result: { data: { updatePasswordViaResetToken: { success: true } } },
        },
      ],
      otherUser,
    );
    await enterPassword();
    await screen.findByRole('heading', { name: 'Your password is ready' });
    expect(store.get(currentUserState.atom)).toEqual(otherUser);
    expect(mockSignOut).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('Back to sign in'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the form available after a failed save', async () => {
    renderReset([
      validationMock,
      {
        request: {
          query: UpdatePasswordViaResetTokenDocument,
          variables: { token, newPassword: password },
        },
        error: new Error('Connection interrupted'),
      },
    ]);
    await enterPassword();
    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Save password' })).toBeEnabled();
    expect(
      screen.queryByRole('heading', { name: 'Your password is ready' }),
    ).not.toBeInTheDocument();
  });

  it('updates the matching signed-in profile and offers to continue to its workspace', async () => {
    const currentUser = {
      id: 'target-user',
      email: 'target@example.com',
      hasPassword: false,
    } as CurrentUser;
    const store = renderReset(
      [
        validationMock,
        {
          request: {
            query: UpdatePasswordViaResetTokenDocument,
            variables: { token, newPassword: password },
          },
          result: { data: { updatePasswordViaResetToken: { success: true } } },
        },
      ],
      currentUser,
    );
    await enterPassword();
    await screen.findByRole('heading', { name: 'Your password is ready' });
    expect(store.get(currentUserState.atom)?.hasPassword).toBe(true);
    await userEvent.click(screen.getByText('Continue to workspace'));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
