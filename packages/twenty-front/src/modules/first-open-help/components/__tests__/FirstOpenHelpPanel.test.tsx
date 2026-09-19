import { i18n, type MessageDescriptor } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FIRST_OPEN_HELP_LAUNCH_ACTIONS } from '@/first-open-help/constants/FirstOpenHelpLaunchActions';
import { FirstOpenHelpPanel } from '@/first-open-help/components/FirstOpenHelpPanel';
import { type FirstOpenHelpTopic } from '@/first-open-help/types/FirstOpenHelpTopic';

const topics: FirstOpenHelpTopic[] = [
  {
    id: 'templates',
    kind: 'COMPARISON',
    title: { message: 'Template or blank?' } as MessageDescriptor,
    body: { message: 'A template copies its shape.' } as MessageDescriptor,
    keywords: ['modele'],
  },
  {
    id: 'find',
    kind: 'FAQ',
    title: { message: 'Find anything' } as MessageDescriptor,
    body: { message: 'Press Cmd+K.' } as MessageDescriptor,
    keywords: [],
  },
];

const renderPanel = ({
  dismissedTopicIds = [],
  onDismissTopic = jest.fn(),
  onRestoreTopic = jest.fn(),
  onRestoreAllTopics = jest.fn(),
  onSelectLaunchAction = jest.fn(),
}: {
  dismissedTopicIds?: string[];
  onDismissTopic?: jest.Mock;
  onRestoreTopic?: jest.Mock;
  onRestoreAllTopics?: jest.Mock;
  onSelectLaunchAction?: jest.Mock;
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <FirstOpenHelpPanel
        context="DOCUMENTS"
        launchActions={FIRST_OPEN_HELP_LAUNCH_ACTIONS.DOCUMENTS}
        topics={topics}
        dismissedTopicIds={dismissedTopicIds}
        onDismissTopic={onDismissTopic}
        onRestoreTopic={onRestoreTopic}
        onRestoreAllTopics={onRestoreAllTopics}
        onSelectLaunchAction={onSelectLaunchAction}
      />
    </I18nProvider>,
  );

describe('FirstOpenHelpPanel', () => {
  it('shows the contextual template and blank actions', () => {
    renderPanel();

    expect(
      screen.getByTestId('first-open-help-action-documents-template'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('first-open-help-action-documents-blank'),
    ).toBeInTheDocument();
  });

  it('reports the selected launch action', async () => {
    const onSelectLaunchAction = jest.fn();

    renderPanel({ onSelectLaunchAction });

    await userEvent.click(
      screen.getByTestId('first-open-help-action-documents-blank'),
    );

    expect(onSelectLaunchAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'documents-blank' }),
    );
  });

  it('renders every topic and reports a dismissal', async () => {
    const onDismissTopic = jest.fn();

    renderPanel({ onDismissTopic });

    expect(
      screen.getByTestId('first-open-help-topic-templates'),
    ).toHaveTextContent('Template or blank?');

    await userEvent.click(
      screen.getByTestId('first-open-help-dismiss-templates'),
    );

    expect(onDismissTopic).toHaveBeenCalledWith('templates');
  });

  it('hides dismissed topics and restores them all', async () => {
    const onRestoreAllTopics = jest.fn();

    renderPanel({ dismissedTopicIds: ['templates'], onRestoreAllTopics });

    expect(screen.queryByTestId('first-open-help-topic-templates')).toBeNull();
    expect(screen.getByTestId('first-open-help-topic-find')).toBeVisible();

    await userEvent.click(screen.getByTestId('first-open-help-restore-all'));

    expect(onRestoreAllTopics).toHaveBeenCalled();
  });

  it('surfaces a dismissed topic through search and filters the rest', async () => {
    renderPanel({ dismissedTopicIds: ['templates'] });

    await userEvent.type(
      screen.getByPlaceholderText('Search help'),
      'template',
    );

    expect(
      screen.getByTestId('first-open-help-topic-templates'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('first-open-help-topic-find')).toBeNull();
    expect(
      screen.getByTestId('first-open-help-restore-templates'),
    ).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    renderPanel();

    await userEvent.type(screen.getByPlaceholderText('Search help'), 'zzzz');

    expect(screen.getByTestId('first-open-help-empty')).toBeInTheDocument();
  });

  it('selects an action and dismisses a topic with the keyboard alone', async () => {
    const onSelectLaunchAction = jest.fn();
    const onDismissTopic = jest.fn();

    renderPanel({ onSelectLaunchAction, onDismissTopic });

    const action = screen.getByTestId(
      'first-open-help-action-documents-template',
    );

    action.focus();
    expect(action).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelectLaunchAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'documents-template' }),
    );

    const dismiss = screen.getByTestId('first-open-help-dismiss-templates');

    dismiss.focus();
    expect(dismiss).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onDismissTopic).toHaveBeenCalledWith('templates');
  });
});
