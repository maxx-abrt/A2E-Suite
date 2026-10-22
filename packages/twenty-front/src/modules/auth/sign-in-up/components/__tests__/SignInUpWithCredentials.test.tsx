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

jest.mock('@/auth/sign-in-up/hooks/useSignInUp', () => ({
  useSignInUp: () => ({
    signInUpMode: SignInUpMode.SignIn,
    continueWithEmail: jest.fn(),
    continueWithCredentials: jest.fn(),
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
      <FormProvider {...form}>
        <SignInUpWithCredentials />
      </FormProvider>
      <output aria-label="Sign-in location">{location.search}</output>
    </>
  );
};

describe('SignInUpWithCredentials', () => {
  it('lets a returning user enter a different email without retaining the previous password or URL hint', async () => {
    i18n.load('en', {});
    i18n.activate('en');
    const store = createStore();
    store.set(signInUpStepState.atom, SignInUpStep.Password);
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
});
