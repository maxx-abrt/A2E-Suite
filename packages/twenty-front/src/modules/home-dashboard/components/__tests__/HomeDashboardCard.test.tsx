import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IconCheckbox } from 'twenty-ui/icon';

import { HomeDashboardCard } from '@/home-dashboard/components/HomeDashboardCard';

const renderCard = (
  seeAllLink?: Parameters<typeof HomeDashboardCard>[0]['seeAllLink'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <HomeDashboardCard
          title="My tasks"
          Icon={IconCheckbox}
          testId="home-card-my-tasks"
          seeAllLink={seeAllLink}
        >
          <p>Card body</p>
        </HomeDashboardCard>
      </MemoryRouter>
    </I18nProvider>,
  );

describe('HomeDashboardCard', () => {
  it('renders its title as a heading and its body', () => {
    renderCard();

    const card = screen.getByTestId('home-card-my-tasks');

    expect(
      screen.getByRole('heading', { name: 'My tasks', level: 2 }),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('Card body');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('deep-links to the native page through an accessible see-all link', () => {
    renderCard({ label: 'See all tasks', to: '/objects/tasks' });

    expect(screen.getByRole('link', { name: 'See all tasks' })).toHaveAttribute(
      'href',
      '/objects/tasks',
    );
  });
});
