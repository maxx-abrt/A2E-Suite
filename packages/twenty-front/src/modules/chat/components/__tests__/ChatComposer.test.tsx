import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { ChatComposer } from '@/chat/components/ChatComposer';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

describe('ChatComposer', () => {
  it('should call onChange when the user types', async () => {
    const onChange = jest.fn();

    render(<ChatComposer value="" onChange={onChange} onSubmit={jest.fn()} />, {
      wrapper: Wrapper,
    });

    await userEvent.type(screen.getByTestId('chat-composer-input'), 'hi');

    expect(onChange).toHaveBeenCalled();
  });

  it('should disable send on an empty draft and submit a non-empty one', async () => {
    const onSubmit = jest.fn();

    render(
      <ChatComposer value="hello" onChange={jest.fn()} onSubmit={onSubmit} />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('chat-composer-send'));

    expect(onSubmit).toHaveBeenCalled();
  });

  it('should disable send on an empty draft', () => {
    render(
      <ChatComposer value="  " onChange={jest.fn()} onSubmit={jest.fn()} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('chat-composer-send')).toBeDisabled();
  });

  it('should insert an emoji from the picker', async () => {
    const onChange = jest.fn();

    render(
      <ChatComposer value="hi " onChange={onChange} onSubmit={jest.fn()} />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('chat-composer-emoji-toggle'));
    await userEvent.click(screen.getByTestId('chat-emoji-🎉'));

    expect(onChange).toHaveBeenCalledWith('hi 🎉');
  });

  it('should forward attach', async () => {
    const onAttach = jest.fn();

    render(
      <ChatComposer
        value=""
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        onAttach={onAttach}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('chat-composer-attach'));

    expect(onAttach).toHaveBeenCalled();
  });

  it('should suggest and insert a mentioned workspace member', async () => {
    const onChange = jest.fn();
    const searchMentionCandidates = jest
      .fn()
      .mockResolvedValue([{ id: 'member-1', label: 'Marie', imageUrl: '' }]);

    render(
      <ChatComposer
        value="hi @ma"
        onChange={onChange}
        onSubmit={jest.fn()}
        searchMentionCandidates={searchMentionCandidates}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('chat-mention-candidate-member-1'),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByTestId('chat-mention-candidate-member-1'),
    );

    expect(searchMentionCandidates).toHaveBeenCalledWith('ma');
    expect(onChange).toHaveBeenCalledWith('hi @[Marie](member-1) ');
  });
});
