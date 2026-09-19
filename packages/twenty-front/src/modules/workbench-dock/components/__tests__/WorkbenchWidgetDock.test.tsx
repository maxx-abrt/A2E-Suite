import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { type ReactNode } from 'react';

import { WorkbenchWidgetDock } from '~/modules/workbench-dock/components/WorkbenchWidgetDock';

jest.mock(
  '~/modules/workbench-dock/components/DefaultWorkbenchWidgetContent',
  () => ({
    DefaultWorkbenchWidgetContent: ({
      definition,
    }: {
      definition: { id: string };
    }) => <div data-testid={`widget-content-${definition.id}`} />,
    getWorkbenchWidgetTitle: (id: string) => id,
  }),
);

const renderDock = (workspaceMembers: PartialWorkspaceMember[] = []) => {
  const store = createStore();

  store.set(currentWorkspaceMembersState.atom, workspaceMembers);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </Provider>
  );

  return render(<WorkbenchWidgetDock />, { wrapper: Wrapper });
};

const renderDockBetweenSentinels = () => {
  const store = createStore();

  store.set(currentWorkspaceMembersState.atom, []);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </Provider>
  );

  return render(
    <>
      <button type="button">before dock</button>
      <WorkbenchWidgetDock />
      <button type="button">after dock</button>
    </>,
    { wrapper: Wrapper },
  );
};

describe('WorkbenchWidgetDock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts in MINI mode and expands the selected widget', () => {
    renderDock();

    expect(screen.getByTestId('workbench-widget-dock')).toHaveAttribute(
      'data-mode',
      'MINI',
    );

    fireEvent.click(screen.getByTestId('workbench-widget-button-presence'));

    expect(screen.getByTestId('workbench-widget-dock')).toHaveAttribute(
      'data-mode',
      'EXPANDED',
    );
    expect(screen.getByTestId('widget-content-presence')).toBeVisible();
  });

  it('switches widgets and collapses back to the rail', () => {
    renderDock();

    fireEvent.click(screen.getByTestId('workbench-widget-button-inbox'));
    expect(screen.getByTestId('widget-content-inbox')).toBeVisible();

    fireEvent.click(screen.getByTestId('workbench-widget-collapse'));

    expect(screen.getByTestId('workbench-widget-dock')).toHaveAttribute(
      'data-mode',
      'MINI',
    );
    expect(screen.queryByTestId('widget-content-inbox')).toBeNull();
  });

  it('hides the team-only presence widget for a solo workspace', () => {
    renderDock([{ id: 'member-1' } as PartialWorkspaceMember]);

    expect(screen.queryByTestId('workbench-widget-button-presence')).toBeNull();
    expect(
      screen.getByTestId('workbench-widget-button-inbox'),
    ).toBeInTheDocument();
  });

  it('keeps the presence widget when the workspace has collaborators', () => {
    renderDock([
      { id: 'member-1' } as PartialWorkspaceMember,
      { id: 'member-2' } as PartialWorkspaceMember,
    ]);

    expect(
      screen.getByTestId('workbench-widget-button-presence'),
    ).toBeInTheDocument();
  });

  it('expands a widget by keyboard and exposes it as a labelled region', async () => {
    renderDock();

    const inboxButton = screen.getByTestId('workbench-widget-button-inbox');

    inboxButton.focus();
    expect(inboxButton).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByTestId('workbench-widget-dock')).toHaveAttribute(
      'data-mode',
      'EXPANDED',
    );
    expect(screen.getByRole('region', { name: 'inbox' })).toBeInTheDocument();
  });

  it('does not trap focus because the dock is not a modal', async () => {
    renderDockBetweenSentinels();

    fireEvent.click(screen.getByTestId('workbench-widget-button-inbox'));

    const collapseButton = screen.getByTestId('workbench-widget-collapse');

    collapseButton.focus();
    expect(collapseButton).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByText('after dock')).toHaveFocus();
  });
});
