import { TemplatesCommand } from '@/template-gallery/components/TemplatesCommand';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';

const mockOpenTemplateGallery = jest.fn();

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({
    openTemplateGallery: mockOpenTemplateGallery,
  }),
}));

jest.mock('@/template-gallery/hooks/useTemplatesCommand', () => ({
  TEMPLATES_COMMAND_ID: 'templates',
  useTemplatesCommand: () => ({
    templatesCommandId: 'templates',
    templatesCommandLabel: 'Templates',
    shouldDisplayTemplatesCommand: true,
  }),
}));

jest.mock('@/ui/layout/selectable-list/components/SelectableListItem', () => ({
  SelectableListItem: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/command-menu/components/CommandMenuItem', () => ({
  CommandMenuItem: ({
    label,
    onClick,
    Icon,
  }: {
    label: string;
    onClick: () => void;
    Icon: IconComponent;
  }) => (
    <button aria-label={label} onClick={onClick}>
      <Icon />
      {label}
    </button>
  ),
}));

describe('TemplatesCommand', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a Templates command labelled from the hook', () => {
    render(<TemplatesCommand />);

    expect(
      screen.getByRole('button', { name: 'Templates' }),
    ).toBeInTheDocument();
  });

  it('opens the gallery modal through the shared seam when clicked', async () => {
    const user = userEvent.setup();

    render(<TemplatesCommand />);

    await user.click(screen.getByRole('button', { name: 'Templates' }));

    expect(mockOpenTemplateGallery).toHaveBeenCalledTimes(1);
  });
});
