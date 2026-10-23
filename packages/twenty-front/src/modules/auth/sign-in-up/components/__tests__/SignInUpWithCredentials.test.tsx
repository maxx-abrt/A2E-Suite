import { SignInUpWithCredentials } from '@/auth/sign-in-up/components/internal/SignInUpWithCredentials';
import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'twenty-ui/theme-constants';

const mockContinueWithCredentials = jest.fn();
let mockSignInUpMode = SignInUpMode.SignIn;

jest.mock('@/auth/sign-in-up/hooks/useSignInUp', () => ({
  useSignInUp: () => ({
    signInUpMode: mockSignInUpMode,
    continueWithEmail: jest.fn(),
    continueWithCredentials: mockContinueWithCredentials,
    submitCredentials: jest.fn(),
  }),
}));

const CredentialsForm = () => {
  const form = useForm<Form>({
    defaultValues: {
      exist: true,
      email: 'previous@example.com',
      password: 'previous-password',
      captchaToken: '',
    },
  });
  const location = useLocation();
  return (
    <>
      {/* oxlint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...form}>
        <SignInUpWithCredentials />
      </FormProvider>
      <output aria-label="Sign-in location">{location.search}</output>
    </>
  );
};

const renderCredentials = (step: SignInUpStep) => {
  const store = createStore();
  store.set(signInUpStepState.atom, step);
  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[
          '/sign-in-up?email=previous%40example.com&inviteToken=invite',
        ]}
      >
        <ThemeProvider colorScheme="light">
          <I18nProvider i18n={i18n}>
            <CredentialsForm />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
  return store;
};

describe('SignInUpWithCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.load('en', {});
    i18n.activate('en');
    mockSignInUpMode = SignInUpMode.SignIn;
  });

  it('shows email immediately and continues through native account discovery', async () => {
    renderCredentials(SignInUpStep.Init);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'autocomplete',
      'username',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with Email' }),
    );
    expect(mockContinueWithCredentials).toHaveBeenCalledTimes(1);
  });

  it.each([
    [SignInUpMode.SignIn, 'current-password'],
    [SignInUpMode.SignUp, 'new-password'],
  ])(
    'uses the appropriate password-manager hint for %s',
    (mode, autoComplete) => {
      mockSignInUpMode = mode;
      renderCredentials(SignInUpStep.Password);
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
        'autocomplete',
        autoComplete,
      );
    },
  );

  it('lets a returning user enter a different email without retaining the previous password or URL hint', async () => {
    renderCredentials(SignInUpStep.Password);
    await userEvent.click(screen.getByText('Use another email'));

    expect(screen.getByPlaceholderText('Email')).toHaveValue('');
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sign-in location')).toHaveTextContent(
      '?inviteToken=invite',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Email'),
      'other@example.com',
    );
    expect(screen.getByPlaceholderText('Email')).toHaveValue(
      'other@example.com',
    );
  });

  it('clears the previous password when the email is edited directly', async () => {
    const store = renderCredentials(SignInUpStep.Password);
    mockContinueWithCredentials.mockImplementation(async () => {
      store.set(signInUpStepState.atom, SignInUpStep.Password);
    });
    await userEvent.clear(screen.getByLabelText('Email'));
    await userEvent.type(screen.getByLabelText('Email'), 'other@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });
});
