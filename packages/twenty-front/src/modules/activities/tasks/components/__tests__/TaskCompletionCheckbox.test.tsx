import { TaskCompletionCheckbox } from '@/activities/tasks/components/TaskCompletionCheckbox';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockComplete = jest.fn();
const mockError = jest.fn();
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
let mockCanComplete = true;
let mockIsCompleted = false;
jest.mock('@/activities/tasks/hooks/useCompleteTask', () => ({
  useCompleteTask: () => ({
    completeTask: mockComplete,
    canCompleteTask: mockCanComplete,
    isCompleted: mockIsCompleted,
  }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: mockError }),
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({ useAtomFamilySelectorValue: () => 'Launch checklist' }),
);

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  jest.clearAllMocks();
  mockCanComplete = true;
  mockIsCompleted = false;
  mockComplete.mockResolvedValue(undefined);
});

const renderCheckbox = (isReadOnly = false) => {
  const openDetails = jest.fn();
  render(
    <I18nProvider i18n={i18n}>
      <div onClick={openDetails}>
        <TaskCompletionCheckbox taskId="task" isReadOnly={isReadOnly} />
      </div>
    </I18nProvider>,
  );
  return openDetails;
};

it('completes directly without opening details', async () => {
  const user = userEvent.setup();
  const openDetails = renderCheckbox();
  await user.click(
    screen.getByRole('checkbox', { name: 'Complete Launch checklist' }),
  );
  expect(mockComplete).toHaveBeenCalledWith(true);
  expect(openDetails).not.toHaveBeenCalled();
});

it('reopens completed tasks with the keyboard', async () => {
  const user = userEvent.setup();
  mockIsCompleted = true;
  renderCheckbox();
  await user.tab();
  expect(
    screen.getByRole('checkbox', { name: 'Reopen Launch checklist' }),
  ).toHaveFocus();
  await user.keyboard(' ');
  expect(mockComplete).toHaveBeenCalledWith(false);
});

it.each(['record', 'status-field'])(
  'respects %s read-only permissions',
  async (permission) => {
    const user = userEvent.setup();
    mockCanComplete = permission !== 'status-field';
    renderCheckbox(permission === 'record');
    await user.click(screen.getByRole('checkbox'));
    expect(mockComplete).not.toHaveBeenCalled();
  },
);

it('blocks repeat toggles until the native mutation settles', async () => {
  const user = userEvent.setup();
  let finish: (() => void) | undefined;
  mockComplete.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  renderCheckbox();
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('checkbox'));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  await act(async () => finish?.());
});

it('reports failed updates and permits retry', async () => {
  const user = userEvent.setup();
  mockComplete.mockRejectedValueOnce(new Error('Offline'));
  renderCheckbox();
  await user.click(screen.getByRole('checkbox'));
  expect(mockError).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringContaining('Could not update'),
    }),
  );
  await user.click(screen.getByRole('checkbox'));
  expect(mockComplete).toHaveBeenCalledTimes(2);
});
