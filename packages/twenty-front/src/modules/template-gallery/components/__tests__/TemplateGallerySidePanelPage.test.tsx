import { TemplateGallerySidePanelPage } from '@/template-gallery/components/TemplateGallerySidePanelPage';
import { useTemplateGalleryItems } from '@/template-gallery/hooks/useTemplateGalleryItems';
import { useApplyTemplate } from '@/template-gallery/hooks/useApplyTemplate';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const mockApply = jest.fn();
const mockRetry = jest.fn();
const mockSnackBar = jest.fn();
jest.mock('@/template-gallery/hooks/useTemplateGalleryItems');
jest.mock('@/template-gallery/hooks/useApplyTemplate');
jest.mock('@/template-gallery/hooks/useUndoTemplateApply', () => ({
  useUndoTemplateApply: () => ({ undoTemplateApplyResult: jest.fn() }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => null,
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueSuccessSnackBar: mockSnackBar,
    enqueueInfoSnackBar: jest.fn(),
  }),
}));
jest.mock('@/side-panel/hooks/useSidePanelHistory', () => ({
  useSidePanelHistory: () => ({ goBackFromSidePanel: jest.fn() }),
}));
jest.mock('@/template-gallery/components/TemplateGallery', () => ({
  TemplateGallery: ({ onUseTemplate }: { onUseTemplate: () => void }) => (
    <button onClick={() => onUseTemplate()}>Apply selected template</button>
  ),
}));
const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);
beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTemplateGalleryItems).mockReturnValue({
    items: [],
    isLoading: false,
    hasError: false,
    retry: mockRetry,
  });
  jest
    .mocked(useApplyTemplate)
    .mockReturnValue({ applyTemplate: mockApply, isApplying: false });
});
describe('template gallery results', () => {
  it('explains a failed write and keeps the selected template available to retry', async () => {
    const user = userEvent.setup();
    mockApply.mockResolvedValue(null);
    render(<TemplateGallerySidePanelPage />, { wrapper: Wrapper });
    await user.click(
      screen.getByRole('button', { name: 'Apply selected template' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your choice is kept; try again.',
    );
    expect(mockSnackBar).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Apply selected template' }),
    ).toBeEnabled();
  });
  it.each([
    ['document', 'Open page', '/bureau/created-record'],
    ['project', 'Open project', '/object/project/created-record'],
  ])(
    'opens the created %s with its native route',
    async (object, label, path) => {
      const user = userEvent.setup();
      mockApply.mockResolvedValue({
        status: 'applied',
        key: 'template',
        version: 1,
        operationId: 'operation',
        created: [{ object, id: 'created-record' }],
      });
      render(<TemplateGallerySidePanelPage />, { wrapper: Wrapper });
      await user.click(
        screen.getByRole('button', { name: 'Apply selected template' }),
      );
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        path,
      );
      expect(mockSnackBar).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ buttonLabel: 'Undo' }),
        }),
      );
    },
  );
  it('shows a working retry when some app descriptors fail to load', async () => {
    const user = userEvent.setup();
    jest.mocked(useTemplateGalleryItems).mockReturnValue({
      items: [],
      isLoading: false,
      hasError: true,
      retry: mockRetry,
    });
    render(<TemplateGallerySidePanelPage />, { wrapper: Wrapper });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Some templates could not load.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Retry loading templates' }),
    );
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
