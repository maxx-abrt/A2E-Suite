import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Banner } from 'twenty-ui/feedback';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useRealtimeConnectionStatus } from '~/modules/realtime/hooks/useRealtimeConnectionStatus';

const StyledBannerWrapper = styled.div`
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledMessage = styled.span`
  font-size: ${themeCssVariables.font.size.sm};
`;

// Rendered inside the existing information-banner stack area; shows only
// while the socket is down or retrying so normal operation costs nothing.
export const RealtimeReconnectBanner = () => {
  const { t } = useLingui();
  const { status } = useRealtimeConnectionStatus();

  const isReconnecting = status === 'reconnecting';
  const isDisconnected = status === 'disconnected';

  if (!isReconnecting && !isDisconnected) {
    return null;
  }

  return (
    <StyledBannerWrapper>
      <Banner color="danger" variant="primary" className="">
        <StyledMessage>
          {isReconnecting
            ? t`Connection lost — reconnecting…`
            : t`You are offline. Some live updates may be missing until the connection comes back.`}
        </StyledMessage>
      </Banner>
    </StyledBannerWrapper>
  );
};
