import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { SettingsAiMonthlyTokenCapSection } from '~/pages/settings/ai/components/SettingsAiMonthlyTokenCapSection';

jest.mock('@/localization/hooks/useNumberFormat', () => ({
  useNumberFormat: () => ({ formatNumber: (value: number) => String(value) }),
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('SettingsAiMonthlyTokenCapSection', () => {
  it('renders month-to-date tokens against a set cap', () => {
    render(
      <SettingsAiMonthlyTokenCapSection capTokens={1000} usedTokens={300} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Tokens used')).toBeInTheDocument();
    expect(screen.getByText('300 of 1000')).toBeInTheDocument();
    expect(screen.queryByText('No cap set')).toBeNull();
  });

  it('renders a month-to-date of zero when the cap is set but nothing was used', () => {
    render(
      <SettingsAiMonthlyTokenCapSection capTokens={1000} usedTokens={null} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('0 of 1000')).toBeInTheDocument();
  });

  it('renders the no-cap state when the cap is null', () => {
    render(
      <SettingsAiMonthlyTokenCapSection capTokens={null} usedTokens={null} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('No cap set')).toBeInTheDocument();
    expect(screen.queryByText('Tokens used')).toBeNull();
  });

  it('treats a zero cap as no cap', () => {
    render(<SettingsAiMonthlyTokenCapSection capTokens={0} usedTokens={0} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('No cap set')).toBeInTheDocument();
  });
});
