import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { BureauStarterTemplates } from '@/bureau/components/BureauStarterTemplates';
import { A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eProjectsApplicationUniversalIdentifier';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockOpenGallery = jest.fn();
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({ openTemplateGallery: mockOpenGallery }),
}));
const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <Provider>{children}</Provider>
  </I18nProvider>
);

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.mocked(useAtomStateValue).mockImplementation((state) =>
    state === applicationsSelector
      ? [
          {
            universalIdentifier: A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER,
          },
        ]
      : { id: 'member-or-workspace' },
  );
});

describe('Bureau starter profiles', () => {
  it.each([
    ['individual', 'Personal goals', 'OBJ'],
    ['student', 'Semester planner', 'SEM'],
    ['nonprofit', 'Grant application', 'SUB'],
    ['business', 'Client onboarding', 'ONB'],
  ])(
    'opens the real project descriptor for %s',
    async (profile, label, key) => {
      const user = userEvent.setup();
      render(<BureauStarterTemplates />, { wrapper: Wrapper });
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Templates for' }),
        profile,
      );
      await user.click(screen.getByRole('button', { name: label }));
      expect(mockOpenGallery).toHaveBeenCalledWith({
        category: 'Projets',
        templateKey: key,
      });
    },
  );
  it('falls back to page templates when Projects is absent and remembers the personal choice', async () => {
    const user = userEvent.setup();
    jest.mocked(useAtomStateValue).mockReturnValue(null);
    jest
      .mocked(useAtomStateValue)
      .mockImplementation((state) =>
        state === applicationsSelector ? [] : { id: 'member-or-workspace' },
      );
    const { unmount } = render(<BureauStarterTemplates />, {
      wrapper: Wrapper,
    });
    await user.selectOptions(screen.getByRole('combobox'), 'student');
    expect(
      screen.queryByRole('button', { name: 'Semester planner' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thesis planner' }));
    expect(mockOpenGallery).toHaveBeenCalledWith({
      category: 'Pages',
      templateKey: 'plan-de-these',
    });
    unmount();
    render(<BureauStarterTemplates />, { wrapper: Wrapper });
    expect(screen.getByRole('combobox')).toHaveValue('student');
    await user.click(
      screen.getByRole('button', { name: 'Browse all templates' }),
    );
    expect(mockOpenGallery).toHaveBeenLastCalledWith();
  });
});
