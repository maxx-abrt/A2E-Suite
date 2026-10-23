import { RecordQuickCreateForm } from '@/object-record/record-create/components/RecordQuickCreateForm';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
});

const renderForm = (
  onCreate = jest.fn().mockResolvedValue({ id: 'task' }),
  onCancel = jest.fn(),
) => {
  const onOutsideClick = jest.fn();
  render(
    <I18nProvider i18n={i18n}>
      <div onClick={onOutsideClick}>
        <RecordQuickCreateForm
          label="Add task"
          onCreate={onCreate}
          onCancel={onCancel}
        />
      </div>
    </I18nProvider>,
  );
  return { onCreate, onCancel, onOutsideClick };
};

it('creates a named task with Enter and stays ready for the next task', async () => {
  const user = userEvent.setup();
  const { onCreate, onOutsideClick } = renderForm();
  const input = screen.getByRole('textbox', { name: 'Add task' });
  expect(input).toHaveFocus();
  await user.type(input, '  Plan the launch  {Enter}');
  expect(onCreate).toHaveBeenCalledWith('Plan the launch');
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
  await user.type(input, 'Write the brief');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(onCreate).toHaveBeenLastCalledWith('Write the brief');
  expect(input).toHaveFocus();
  expect(onOutsideClick).not.toHaveBeenCalled();
});

it('does not create blank tasks and cancels without creating an empty record', async () => {
  const user = userEvent.setup();
  const { onCreate, onCancel } = renderForm();
  expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  await user.type(screen.getByRole('textbox'), '   {Enter}{Escape}');
  expect(onCreate).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('keeps a failed title for retry', async () => {
  const user = userEvent.setup();
  const onCreate = jest
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ id: 'task' });
  renderForm(onCreate);
  await user.type(screen.getByRole('textbox'), 'Keep this idea{Enter}');
  expect(screen.getByRole('alert')).toHaveTextContent('Your text is kept');
  expect(screen.getByRole('textbox')).toHaveValue('Keep this idea');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(onCreate).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox')).toHaveValue('');
});

it('prevents duplicate submissions and cancellation while saving', async () => {
  const user = userEvent.setup();
  let finishCreation: (() => void) | undefined;
  const onCreate = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finishCreation = resolve;
      }),
  );
  const { onCancel } = renderForm(onCreate);
  await user.type(
    screen.getByRole('textbox'),
    'One task{Enter}{Enter}{Escape}',
  );
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(onCancel).not.toHaveBeenCalled();
  await act(async () => finishCreation?.());
  expect(screen.getByRole('textbox')).toHaveValue('');
});

it('does not submit Enter while an input method is composing', async () => {
  const user = userEvent.setup();
  const { onCreate } = renderForm();
  await user.type(screen.getByRole('textbox'), 'Draft');
  const wasNotCancelled = fireEvent.keyDown(screen.getByRole('textbox'), {
    key: 'Enter',
    isComposing: true,
  });
  expect(wasNotCancelled).toBe(false);
  expect(onCreate).not.toHaveBeenCalled();
});
