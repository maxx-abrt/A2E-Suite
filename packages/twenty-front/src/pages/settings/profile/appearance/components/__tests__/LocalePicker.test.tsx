import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { LocalePicker } from '~/pages/settings/profile/appearance/components/LocalePicker';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockMutation = jest.fn();
const mockErrorSnackBar = jest.fn();
const mockInvalidate = jest.fn();
const member = {
  id: 'member-a',
  name: { firstName: 'A', lastName: 'User' },
  locale: 'en',
  colorScheme: 'Light' as const,
  avatarUrl: null,
  userEmail: 'a@example.com',
  workspaceId: 'workspace-a',
};

jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockMutation],
}));
jest.mock('@/metadata-store/hooks/useInvalidateMetadataStore', () => ({
  useInvalidateMetadataStore: () => ({
    invalidateMetadataStore: mockInvalidate,
  }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueErrorSnackBar: mockErrorSnackBar,
    enqueueInfoSnackBar: jest.fn(),
  }),
}));
jest.mock('~/utils/i18n/dynamicActivate', () => ({
  dynamicActivate: jest.fn(async (locale: string) => locale),
}));
jest.mock('~/utils/logError', () => ({ logError: jest.fn() }));
jest.mock('~/localization/hooks/useLocaleOptions', () => ({
  useLocaleOptions: () => [
    { label: 'English', value: 'en' },
    { label: 'French', value: 'fr-FR' },
  ],
}));
jest.mock('@/ui/input/components/Select', () => ({
  Select: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
  }) => (
    <select
      aria-label="Language"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="en">English</option>
      <option value="fr-FR">French</option>
    </select>
  ),
}));

const renderPicker = () => {
  const store = createStore();
  store.set(currentWorkspaceMemberState.atom, member);
  render(
    <Provider store={store}>
      <I18nProvider i18n={i18n}>
        <LocalePicker />
      </I18nProvider>
    </Provider>,
  );
  return store;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  i18n.load('en', {});
  i18n.activate('en');
  mockMutation.mockResolvedValue({
    data: { updateWorkspaceMemberSettings: true },
  });
});

it('saves through native member settings before applying the language', async () => {
  const store = renderPicker();
  await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'fr-FR');
  await waitFor(() => expect(localStorage.getItem('locale')).toBe('fr-FR'));
  expect(store.get(currentWorkspaceMemberState.atom)?.locale).toBe('fr-FR');
  expect(mockMutation).toHaveBeenCalledWith({
    variables: {
      input: { workspaceMemberId: 'member-a', update: { locale: 'fr-FR' } },
    },
  });
  expect(dynamicActivate).toHaveBeenCalledWith(
    'fr-FR',
    expect.objectContaining({ canActivate: expect.any(Function) }),
  );
  expect(mockInvalidate).toHaveBeenCalledTimes(1);
});

it.each(['rejection', 'false response'])(
  'preserves the saved language and reports a %s',
  async (failure) => {
    if (failure === 'rejection')
      mockMutation.mockRejectedValue(new Error('offline'));
    else
      mockMutation.mockResolvedValue({
        data: { updateWorkspaceMemberSettings: false },
      });
    const store = renderPicker();
    await userEvent
      .setup()
      .selectOptions(screen.getByRole('combobox'), 'fr-FR');
    await waitFor(() => expect(mockErrorSnackBar).toHaveBeenCalled());
    expect(store.get(currentWorkspaceMemberState.atom)?.locale).toBe('en');
    expect(screen.getByRole('combobox')).toHaveValue('en');
    expect(dynamicActivate).not.toHaveBeenCalled();
    expect(localStorage.getItem('locale')).toBeNull();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  },
);

it('disables duplicate changes while saving and ignores a response for a previous account', async () => {
  let resolveMutation: (response: {
    data: { updateWorkspaceMemberSettings: boolean };
  }) => void = () => {};
  mockMutation.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveMutation = resolve;
    }),
  );
  const store = renderPicker();
  await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'fr-FR');
  expect(screen.getByRole('combobox')).toBeDisabled();
  act(() => {
    store.set(currentWorkspaceMemberState.atom, {
      ...member,
      id: 'member-b',
      locale: 'en',
    });
  });
  await act(async () => {
    resolveMutation({ data: { updateWorkspaceMemberSettings: true } });
  });
  expect(store.get(currentWorkspaceMemberState.atom)?.id).toBe('member-b');
  expect(store.get(currentWorkspaceMemberState.atom)?.locale).toBe('en');
  expect(dynamicActivate).not.toHaveBeenCalled();
  expect(localStorage.getItem('locale')).toBeNull();
});
