import { UnavailableFilePreview } from '@/activities/files/components/UnavailableFilePreview';
import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  padding: 0 ${themeCssVariables.spacing[6]};
`;

const StyledAudio = styled.audio`
  width: 100%;
`;

type AudioPreviewProps = {
  audioName: string;
  audioUrl: string;
};

export const AudioPreview = ({ audioName, audioUrl }: AudioPreviewProps) => {
  const [hasFailedToLoad, setHasFailedToLoad] = useState(false);

  if (hasFailedToLoad) {
    return (
      <UnavailableFilePreview
        fileName={audioName}
        fileUrl={audioUrl}
        message={
          <Trans>
            This audio file could not be loaded. Please download the file to
            listen to it.
          </Trans>
        }
      />
    );
  }

  return (
    <StyledContainer>
      <StyledAudio
        controls
        src={audioUrl}
        onError={() => setHasFailedToLoad(true)}
      />
    </StyledContainer>
  );
};
