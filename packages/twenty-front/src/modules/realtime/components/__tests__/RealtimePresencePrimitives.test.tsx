import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { RealtimePresenceAvatarStack } from '~/modules/realtime/components/RealtimePresenceAvatarStack';
import { RealtimeTypingIndicator } from '~/modules/realtime/components/RealtimeTypingIndicator';

const workspaceMember = {
  id: 'member-1',
  userEmail: 'ada@example.com',
  avatarUrl: null,
  name: {
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
} as PartialWorkspaceMember;

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('realtime presence primitives', () => {
  it('renders the online member avatar stack with an accessible label', () => {
    render(
      <RealtimePresenceAvatarStack workspaceMembers={[workspaceMember]} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('presence-avatar-stack')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Ada Lovelace'),
    );
  });

  it('renders a polite typing status and hides it when idle', () => {
    const { rerender } = render(
      <RealtimeTypingIndicator workspaceMembers={[workspaceMember]} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('presence-typing-indicator')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByTestId('presence-typing-text')).toHaveTextContent('Ada');

    rerender(<RealtimeTypingIndicator workspaceMembers={[]} />);

    expect(screen.queryByTestId('presence-typing-indicator')).toBeNull();
  });
});
