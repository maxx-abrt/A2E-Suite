import { isSharedDomainWorkspaceEnabledState } from '@/client-config/states/isSharedDomainWorkspaceEnabledState';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import {
  GetWorkspaceCreationDefaultsDocument,
  IdentityProviderType,
  SsoIdentityProviderStatus,
  type AvailableWorkspace,
} from '~/generated-metadata/graphql';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const redirectToSsoLoginPageMock = jest.fn();

jest.mock('@/auth/sign-in-up/hooks/useSso', () => ({
  useSso: () => ({ redirectToSsoLoginPage: redirectToSsoLoginPageMock }),
}));

const buildWorkspaceUrlMock = jest.fn();
const signOutMock = jest.fn();
const createWorkspaceMock = jest.fn();
const handleResetPasswordMock = jest.fn();
const resetPasswordClickMock = jest.fn();

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
  }),
}));

jest.mock('@/domain-manager/hooks/useBuildWorkspaceUrl', () => ({
  useBuildWorkspaceUrl: () => ({
    buildWorkspaceUrl: buildWorkspaceUrlMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: () => ({
    createWorkspace: createWorkspaceMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignInUpForm', () => ({
  useSignInUpForm: () => ({
    form: {
      getValues: () => 'person@example.com',
    },
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useHandleResetPassword', () => ({
  useHandleResetPassword: () => ({
    handleResetPassword: handleResetPasswordMock,
  }),
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithCredentials',
  () => ({
    SignInUpWithCredentials: () => <div>credentials-form</div>,
  }),
);

jest.mock('@/auth/sign-in-up/components/internal/SignInUpWithGoogle', () => ({
  SignInUpWithGoogle: () => null,
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithMicrosoft',
  () => ({
    SignInUpWithMicrosoft: () => null,
  }),
);

dynamicActivate(SOURCE_LOCALE);

const renderWorkspacePicker = () => {
  jotaiStore.set(signInUpStepState.atom, SignInUpStep.WorkspaceSelection);
  return render(
    <MockedProvider
      mocks={[
        {
          request: { query: GetWorkspaceCreationDefaultsDocument },
          result: {
            data: {
              getWorkspaceCreationDefaults: {
                displayName: 'My workspace',
                subdomain: 'my-workspace',
              },
            },
          },
        },
      ]}
    >
      <JotaiProvider store={jotaiStore}>
        <MemoryRouter>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <SignInUpGlobalScopeForm />
              <WorkspaceSelectionFooter />
            </I18nProvider>
          </ThemeProvider>
        </MemoryRouter>
      </JotaiProvider>
    </MockedProvider>,
  );
};

const workspace = (id: string, displayName: string): AvailableWorkspace => ({
  id,
  displayName,
  sso: [],
  workspaceUrls: { subdomainUrl: `https://${id}.example.com` },
});

describe('SignInUpGlobalScopeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    handleResetPasswordMock.mockReturnValue(resetPasswordClickMock);
    resetPasswordClickMock.mockResolvedValue(true);
    buildWorkspaceUrlMock.mockImplementation((baseUrl: string) => baseUrl);
  });

  it('sends a reset link and keeps a clear inbox confirmation on the password step', async () => {
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Password);
    jotaiStore.set(authProvidersState.atom, {
      google: false,
      magicLink: false,
      microsoft: false,
      password: true,
      sso: [],
    });

    render(
      <MockedProvider mocks={[]}>
        <JotaiProvider store={jotaiStore}>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <SignInUpGlobalScopeForm />
            </I18nProvider>
          </ThemeProvider>
        </JotaiProvider>
      </MockedProvider>,
    );

    const forgotPasswordLink = screen.getByText('Forgot your password?');

    expect(forgotPasswordLink).toBeInTheDocument();
    await userEvent.click(forgotPasswordLink);

    expect(handleResetPasswordMock).toHaveBeenCalledWith('person@example.com');
    expect(resetPasswordClickMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'If this email is registered',
    );
    expect(
      screen.getByRole('button', { name: 'Check your inbox' }),
    ).toBeDisabled();
  });
  it('offers keyboard-accessible creation and explains the zero-workspace state', async () => {
    renderWorkspacePicker();
    expect(
      screen.getByText('Signed in as person@example.com'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No workspaces yet/)).toBeInTheDocument();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Create a workspace' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(jotaiStore.get(signInUpStepState.atom)).toBe(
      SignInUpStep.WorkspaceCreation,
    );
  });

  it('distinguishes joined spaces from joinable spaces without duplicating a workspace', () => {
    const joined = workspace('joined', 'Team workspace');
    jotaiStore.set(availableWorkspacesState.atom, {
      availableWorkspacesForSignIn: [joined],
      availableWorkspacesForSignUp: [
        joined,
        workspace('joinable', 'Another team'),
      ],
    });
    renderWorkspacePicker();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('Your workspace')).toBeInTheDocument();
    expect(screen.getByText('Available to join')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Team workspace/ }),
    ).toHaveAttribute('href', 'https://joined.example.com');
  });

  it('preserves maintenance restrictions on workspace creation', () => {
    jotaiStore.set(isDDLLockedState.atom, true);
    renderWorkspacePicker();
    expect(
      screen.queryByRole('button', { name: 'Create a workspace' }),
    ).not.toBeInTheDocument();
  });
  it('lets keyboard users sign out before choosing a different account', async () => {
    renderWorkspacePicker();
    await userEvent.tab();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Use another account' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

describe('shared-domain workspace choices', () => {
  beforeEach(() => {
    resetJotaiStore();
    jest.clearAllMocks();
    buildWorkspaceUrlMock.mockImplementation((baseUrl: string) => baseUrl);
  });

  it('keeps SSO-only workspaces on the picker and offers their own identity provider', async () => {
    jotaiStore.set(isSharedDomainWorkspaceEnabledState.atom, true);
    jotaiStore.set(availableWorkspacesState.atom, {
      availableWorkspacesForSignIn: [
        {
          ...workspace('sso-space', 'Research team'),
          sso: [
            {
              id: 'provider-id',
              name: 'Team identity',
              issuer: 'https://identity.example.com',
              type: IdentityProviderType.OIDC,
              status: SsoIdentityProviderStatus.Active,
            },
          ],
        },
      ],
      availableWorkspacesForSignUp: [],
    });
    renderWorkspacePicker();
    await waitFor(() =>
      expect(
        screen.getByText('Use your workspace sign-in method'),
      ).toBeVisible(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Team identity' }),
    );
    expect(redirectToSsoLoginPageMock).toHaveBeenCalledWith('provider-id');
    expect(
      screen.queryByRole('link', { name: /Research team/ }),
    ).not.toBeInTheDocument();
  });

  it('uses a real document link for a token-bearing workspace choice', () => {
    jotaiStore.set(isSharedDomainWorkspaceEnabledState.atom, true);
    jotaiStore.set(availableWorkspacesState.atom, {
      availableWorkspacesForSignIn: [
        {
          ...workspace('first', 'Design team'),
          loginToken: 'signed-login-token',
        },
      ],
      availableWorkspacesForSignUp: [],
    });
    buildWorkspaceUrlMock.mockReturnValue(
      'https://app.example.com/verify?loginToken=signed-login-token',
    );
    renderWorkspacePicker();
    expect(screen.getByRole('link', { name: /Design team/ })).toHaveAttribute(
      'href',
      'https://app.example.com/verify?loginToken=signed-login-token',
    );
  });
});
