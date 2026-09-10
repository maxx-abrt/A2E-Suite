import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const renderDock = () => {
  const store = createStore();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </Provider>
  );

  return render(<WorkbenchWidgetDock />, { wrapper: Wrapper });
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
});
