import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { OnboardingStartFromScratchContent } from '@/onboarding/components/OnboardingStartFromScratchContent';
import { ONBOARDING_APP_CATALOGUE } from '@/onboarding/constants/OnboardingAppCatalogue';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('OnboardingStartFromScratchContent', () => {
  it('lists exactly the five suite apps with a row each', () => {
    render(
      <OnboardingStartFromScratchContent
        onConfirm={jest.fn()}
        isCompleting={false}
      />,
      { wrapper: Wrapper },
    );

    for (const app of ONBOARDING_APP_CATALOGUE) {
      expect(
        screen.getByTestId(`onboarding-app-catalogue-${app.key}`),
      ).toBeInTheDocument();
    }

    expect(screen.getAllByText('Bureau').length).toBeGreaterThan(0);
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Bilan')).toBeInTheDocument();
    expect(screen.getByText('Syna')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('starts from scratch with no app installs when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <OnboardingStartFromScratchContent
        onConfirm={onConfirm}
        isCompleting={false}
      />,
      { wrapper: Wrapper },
    );

    await user.click(
      screen.getByRole('button', { name: 'Start with an empty workspace' }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirmation disabled while the step is completing', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <OnboardingStartFromScratchContent onConfirm={onConfirm} isCompleting />,
      { wrapper: Wrapper },
    );

    const confirmButton = screen.getByRole('button', {
      name: 'Start with an empty workspace',
    });

    expect(confirmButton).toBeDisabled();

    await user.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
