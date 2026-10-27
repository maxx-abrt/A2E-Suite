import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';

const renderLearnMore = (
  appKey: Parameters<typeof A2eLearnMoreLink>[0]['appKey'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <A2eLearnMoreLink appKey={appKey} />
    </I18nProvider>,
  );

describe('A2eLearnMoreLink', () => {
  it('routes each app to its matching doc page', () => {
    renderLearnMore('bureau');

    const link = screen.getByTestId('a2e-learn-more-bureau');

    expect(link).toHaveAttribute('href', 'https://a2esuite.com/apps/bureau');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders nothing when no app key is provided', () => {
    renderLearnMore(undefined);

    expect(screen.queryByTestId('a2e-learn-more-bureau')).toBeNull();
  });
});
