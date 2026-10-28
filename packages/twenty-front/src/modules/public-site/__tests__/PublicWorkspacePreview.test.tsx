import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PublicWorkspacePreview } from '@/public-site/PublicWorkspacePreview';

const renderPreview = (initialTabId?: string) =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <PublicWorkspacePreview initialTabId={initialTabId} />
      </MemoryRouter>
    </I18nProvider>,
  );

describe('detailed public workspace preview', () => {
  const originalPointerEvent = window.PointerEvent;

  beforeAll(() => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: MouseEvent,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: originalPointerEvent,
    });
  });

  it('keeps Pages and Projects inside Bureau, with six top-level applications', async () => {
    renderPreview();
    const user = userEvent.setup();
    expect(screen.queryByRole('tab', { name: 'Projects' })).toBeNull();
    expect(
      within(
        screen.getByRole('tablist', { name: 'Explore the applications' }),
      ).getAllByRole('tab'),
    ).toHaveLength(6);
    const bureau = screen.getByRole('navigation', {
      name: 'Bureau example sections',
    });
    await user.click(within(bureau).getByRole('button', { name: 'Projects' }));
    expect(
      screen.getByRole('tab', { name: 'Bureau', selected: true }),
    ).toBeVisible();
    expect(screen.getByRole('table', { name: 'Team handbook' })).toBeVisible();
    await user.click(within(bureau).getByRole('button', { name: 'Pages' }));
    expect(screen.getByRole('button', { name: 'Project brief' })).toBeVisible();
  });

  it('opens companies with their domain and owner, and filters the same sample accounts', async () => {
    renderPreview('crm');
    const user = userEvent.setup();
    const table = screen.getByRole('table', { name: 'Example companies' });
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    await user.click(screen.getByRole('button', { name: 'My accounts' }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /Studio North/ }));
    const details = screen.getByRole('complementary', {
      name: 'Example record details',
    });
    expect(details).toHaveTextContent('studio-north.example');
    expect(details).toHaveTextContent('Maya Laurent');
  });

  it('filters records, completes tasks and keeps the same state in a board and across apps', async () => {
    renderPreview('projects');
    const user = userEvent.setup();
    const table = screen.getByRole('table', { name: 'Team handbook' });
    expect(
      within(table).getByRole('columnheader', { name: 'Assignee' }),
    ).toBeVisible();
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    const search = screen.getByRole('textbox', {
      name: 'Search example records',
    });
    await user.type(search, 'gather');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.click(
      screen.getByRole('checkbox', { name: 'Gather the first ideas' }),
    );
    expect(screen.getByText('2 of 5 steps complete')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Incomplete' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No example records match',
    );
    await user.click(screen.getByRole('button', { name: 'Incomplete' }));
    await user.clear(search);
    await user.click(screen.getByRole('button', { name: 'Board' }));
    await user.click(
      screen.getByRole('button', { name: /Gather the first ideas/ }),
    );
    const detail = screen.getByRole('complementary', {
      name: 'Example record details',
    });
    expect(within(detail).getByText('Done')).toBeVisible();
    await user.click(
      within(detail).getByRole('button', { name: 'Mark incomplete' }),
    );
    expect(within(detail).getByText('In progress')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(
      screen.getByRole('button', { name: /Gather the first ideas/ }),
    ).toHaveFocus();
    await user.click(screen.getByRole('tab', { name: 'Archive' }));
    await user.click(screen.getByRole('button', { name: 'Projects' }));
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('1 of 5 steps complete')).toBeVisible();
  });

  it('sorts opportunity rows and opens their matching details from a board', async () => {
    renderPreview('crm');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Opportunities' }));
    const table = screen.getByRole('table', { name: 'Opportunities' });
    const firstName = within(table).getAllByRole('row')[1].textContent;
    await user.click(
      screen.getByRole('button', { name: 'Reverse record order' }),
    );
    expect(within(table).getAllByRole('row')[1].textContent).not.toBe(
      firstName,
    );
    await user.click(screen.getByRole('button', { name: 'Proposals' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Board' }));
    await user.click(screen.getByRole('button', { name: /Team workspace/ }));
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('Atelier');
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('3,200');
  });

  it('shows consistent finance totals, unpaid filters and separate quote records', async () => {
    renderPreview('bilan');
    const user = userEvent.setup();
    expect(screen.getByLabelText('Example document totals')).toHaveTextContent(
      '5,050',
    );
    expect(screen.getByLabelText('Example document totals')).toHaveTextContent(
      '1,450',
    );
    await user.click(screen.getByRole('button', { name: 'Unpaid' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      3,
    );
    await user.click(screen.getByRole('button', { name: 'INV-026' }));
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('Website project');
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('Studio North');
    await user.click(screen.getByRole('button', { name: 'Quotes' }));
    expect(
      screen.queryByRole('complementary', { name: 'Example record details' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'QUO-012' })).toBeVisible();
    expect(screen.getByLabelText('Example document totals')).toHaveTextContent(
      '4,150',
    );
    expect(
      within(screen.getByLabelText('Example document totals')).getByText(
        'Awaiting reply',
      ),
    ).toBeVisible();
  });

  it('opens a sample folder and file preview without a file service', async () => {
    renderPreview('archive');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Project documents' }));
    expect(screen.getByRole('button', { name: 'All files' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'PDF only' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      2,
    );
    await user.click(screen.getByRole('button', { name: 'Team handbook.pdf' }));
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('Welcome to A2E Studio');
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    await user.click(screen.getByRole('button', { name: 'PDF only' }));
    await user.click(screen.getByRole('button', { name: 'All files' }));
    expect(
      screen.getByRole('button', { name: 'Project documents' }),
    ).toBeVisible();
  });

  it('changes calendar views, navigates ranges and opens event details', async () => {
    renderPreview('agenda');
    const user = userEvent.setup();
    expect(
      within(
        screen.getByRole('region', { name: 'Example calendar' }),
      ).getByText('Plan the next review'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Task due dates' }));
    expect(
      within(
        screen.getByRole('region', { name: 'Example calendar' }),
      ).queryByText('Plan the next review'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Project review/ }));
    expect(
      screen.getByRole('complementary', { name: 'Example record details' }),
    ).toHaveTextContent('14:00');
    await user.click(screen.getByRole('button', { name: 'Day' }));
    expect(
      screen.queryByRole('complementary', { name: 'Example record details' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: /Project review/ }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next period' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No example events in this range',
    );
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(
      screen.getByRole('button', { name: /Project review/ }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Month' }));
    expect(
      screen.getByRole('button', { name: /Weekly planning/ }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Agenda' }));
    expect(screen.getByRole('button', { name: /Team catch-up/ })).toBeVisible();
  });

  it('offers prepared assistant examples and returns to the connected Bureau pages', async () => {
    renderPreview('syna');
    const user = userEvent.setup();
    expect(
      screen.getByText(/does not send a request to an AI service/),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Prepare the review' }),
    );
    expect(
      screen.getByText('What should we cover in the next project review?'),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Explore the example pages' }),
    );
    expect(
      screen.getByRole('tab', { name: 'Bureau', selected: true }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Project brief' })).toBeVisible();
  });

  it('switches only its own theme and supports multiple independent previews', async () => {
    const before = document.documentElement.className;
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <PublicWorkspacePreview />
          <PublicWorkspacePreview initialTabId="projects" />
        </MemoryRouter>
      </I18nProvider>,
    );
    const user = userEvent.setup();
    const [first, second] = screen.getAllByRole('region', {
      name: 'Interactive example workspace',
    });
    await user.click(
      within(first).getByRole('button', { name: 'Use dark preview' }),
    );
    expect(
      within(first).getByRole('button', { name: 'Use light preview' }),
    ).toBeVisible();
    expect(
      within(second).getByRole('button', { name: 'Use dark preview' }),
    ).toBeVisible();
    expect(document.documentElement.className).toBe(before);
    const panels = screen.getAllByRole('tabpanel');
    expect(panels[0].id).not.toBe(panels[1].id);
    expect(within(first).getByRole('tab', { selected: true })).toHaveAttribute(
      'aria-controls',
      panels[0].id,
    );
    expect(within(second).getByRole('tab', { selected: true })).toHaveAttribute(
      'aria-controls',
      panels[1].id,
    );
  });
});
