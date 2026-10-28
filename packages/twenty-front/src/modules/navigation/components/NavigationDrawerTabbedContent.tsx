import { AiChatSkeletonLoader } from '@/ai/components/internal/AiChatSkeletonLoader';
import { styled } from '@linaria/react';
import { lazy, type ReactNode, Suspense, useState } from 'react';

const NavigationDrawerAiChatContent = lazy(() =>
  import('@/ai/components/NavigationDrawerAiChatContent').then((module) => ({
    default: module.NavigationDrawerAiChatContent,
  })),
);

type NavigationDrawerTabbedContentProps = {
  showAiChatContent: boolean;
  shouldMountAiChatContent: boolean;
  navigationContent: ReactNode;
};

const StyledTabContent = styled.div<{ isHidden: boolean }>`
  display: ${({ isHidden }) => (isHidden ? 'none' : 'contents')};
`;

export const NavigationDrawerTabbedContent = ({
  showAiChatContent,
  shouldMountAiChatContent,
  navigationContent,
}: NavigationDrawerTabbedContentProps) => {
  const [hasOpenedAiChat, setHasOpenedAiChat] = useState(showAiChatContent);

  if (showAiChatContent && !hasOpenedAiChat) {
    setHasOpenedAiChat(true);
  }

  return (
    <>
      <StyledTabContent
        isHidden={showAiChatContent}
        aria-hidden={showAiChatContent}
      >
        {navigationContent}
      </StyledTabContent>
      {shouldMountAiChatContent && hasOpenedAiChat && (
        <StyledTabContent
          isHidden={!showAiChatContent}
          aria-hidden={!showAiChatContent}
        >
          <Suspense fallback={<AiChatSkeletonLoader />}>
            <NavigationDrawerAiChatContent />
          </Suspense>
        </StyledTabContent>
      )}
    </>
  );
};
