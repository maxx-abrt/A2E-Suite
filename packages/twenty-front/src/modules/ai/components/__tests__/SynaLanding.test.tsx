import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { SynaLanding } from '@/ai/components/SynaLanding';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { messages } from '~/locales/generated/en';

const mockOpenTemplateGallery = jest.fn();
const mockSwitchToNewChat = jest.fn();
const mockHandleThreadClick = jest.fn();
const mockAvailability = jest.fn();
const mockHasPermissionFlag = jest.fn();

jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({
    openTemplateGallery: mockOpenTemplateGallery,
  }),
}));

jest.mock('@/ai/hooks/useSwitchToNewAiChat', () => ({
  useSwitchToNewAiChat: () => ({ switchToNewChat: mockSwitchToNewChat }),
}));

jest.mock('@/ai/hooks/useAiChatThreadClick', () => ({
  useAiChatThreadClick: () => ({ handleThreadClick: mockHandleThreadClick }),
}));

jest.mock('@/ai/hooks/useWorkspaceAiModelAvailability', () => ({
  useWorkspaceAiModelAvailability: () => mockAvailability(),
}));

jest.mock('@/ai/contexts/AiChatSurfaceContext', () => ({
  AiChatSurfaceContext: {
    ...jest.requireActual('@/ai/contexts/AiChatSurfaceContext')
      .AiChatSurfaceContext,
    Provider: () => null,
  },
}));

jest.mock('@/settings/roles/hooks/useHasPermissionFlag', () => ({
  useHasPermissionFlag: (flag: PermissionFlagType) =>
    mockHasPermissionFlag(flag),
}));

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const AI_THREADS_STORE_KEY = 'agentChatThreads';

const buildThread = (id: string, title: string, lastMessageAt: string) => ({
  __typename: 'AgentChatThread',
  id,
  title,
  conversationSize: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: lastMessageAt,
  lastMessageAt,
  totalInputCredits: 0,
  totalInputTokens: 0,
  totalOutputCredits: 0,
  totalOutputTokens: 0,
});

const setThreads = (threads: ReturnType<typeof buildThread>[]) => {
  jotaiStore.set(metadataStoreState.atomFamily(AI_THREADS_STORE_KEY), {
    current: threads,
    status: 'loaded',
  } as never);
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>
    <I18nProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nProvider>
  </JotaiProvider>
);

describe('SynaLanding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setThreads([]);
    mockHasPermissionFlag.mockReturnValue(true);
    mockAvailability.mockReturnValue({ hasConfiguredAiProvider: true });
  });

  it('should render the landing when AI is available', () => {
    render(<SynaLanding />, { wrapper: Wrapper });

    expect(screen.getByTestId('syna-landing')).toBeInTheDocument();
    expect(screen.getByTestId('syna-new-conversation')).toBeInTheDocument();
    expect(
      screen.queryByTestId('syna-landing-connect'),
    ).not.toBeInTheDocument();
  });

  it('should render nothing for a member without AI permission', () => {
    mockHasPermissionFlag.mockImplementation(
      (flag: PermissionFlagType) =>
        flag !== PermissionFlagType.AI &&
        flag !== PermissionFlagType.AI_SETTINGS,
    );

    const { container } = render(<SynaLanding />, { wrapper: Wrapper });

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the admin connect link, not AI entries, when no provider is configured', () => {
    mockAvailability.mockReturnValue({ hasConfiguredAiProvider: false });

    render(<SynaLanding />, { wrapper: Wrapper });

    expect(screen.getByTestId('syna-landing-connect')).toBeInTheDocument();
    expect(screen.queryByTestId('syna-landing')).not.toBeInTheDocument();
  });

  it('should hide the connect link when no provider is configured and the user is not an admin', () => {
    mockAvailability.mockReturnValue({ hasConfiguredAiProvider: false });
    mockHasPermissionFlag.mockImplementation(
      (flag: PermissionFlagType) => flag !== PermissionFlagType.AI_SETTINGS,
    );

    const { container } = render(<SynaLanding />, { wrapper: Wrapper });

    expect(container).toBeEmptyDOMElement();
  });

  it('should link the connect entry to the AI providers settings', () => {
    mockAvailability.mockReturnValue({ hasConfiguredAiProvider: false });

    render(<SynaLanding />, { wrapper: Wrapper });

    expect(screen.getByTestId('syna-connect-provider')).toHaveAttribute(
      'href',
      getSettingsPath(SettingsPath.AiProviders),
    );
  });

  it('should start a new conversation from the primary action', () => {
    render(<SynaLanding />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('syna-new-conversation'));

    expect(mockSwitchToNewChat).toHaveBeenCalledTimes(1);
  });

  it('should open the gallery on the Syna category for a featured template', () => {
    render(<SynaLanding />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('syna-template-syna-resume-page'));

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Syna',
      templateKey: 'syna-resume-page',
    });
  });

  it('should expose every READY recipe in the actions library and open its descriptor', () => {
    render(<SynaLanding />, { wrapper: Wrapper });

    fireEvent.click(
      screen.getByTestId('syna-action-syna-eligibilite-subventions'),
    );

    expect(mockOpenTemplateGallery).toHaveBeenCalledWith({
      category: 'Syna',
      templateKey: 'syna-eligibilite-subventions',
    });
    expect(
      screen.queryByTestId('syna-action-syna-facture-depuis-temps'),
    ).not.toBeInTheDocument();
  });

  it('should list the most recent runs from the existing thread data', () => {
    setThreads([
      buildThread('older', 'Older run', '2026-01-01T08:00:00.000Z'),
      buildThread('newer', 'Newer run', '2026-01-03T08:00:00.000Z'),
    ]);

    render(<SynaLanding />, { wrapper: Wrapper });

    const recentRunButtons = screen.getAllByTestId(/^syna-recent-run-/);

    expect(recentRunButtons).toHaveLength(2);
    expect(recentRunButtons[0]).toHaveAttribute(
      'data-testid',
      'syna-recent-run-newer',
    );

    fireEvent.click(recentRunButtons[0]);

    expect(mockHandleThreadClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'newer' }),
    );
  });

  it('should show an empty state for recent runs when there is no thread', () => {
    render(<SynaLanding />, { wrapper: Wrapper });

    expect(
      screen.getByText('No runs yet. Start a conversation above.'),
    ).toBeInTheDocument();
  });
});
