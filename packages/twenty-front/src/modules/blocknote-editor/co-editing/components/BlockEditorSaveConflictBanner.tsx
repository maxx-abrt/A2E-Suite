import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Banner } from 'twenty-ui/feedback';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBannerWrapper = styled.div`
  margin-bottom: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledContent = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  width: 100%;
`;

const StyledMessages = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.span`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledDetail = styled.span`
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

type BlockEditorSaveConflictBannerProps = {
  conflictingBlockCount: number;
  onKeepLocal: () => void;
  onUseRemote: () => void;
};

// Shown only while an expected-revision save is blocked: the draft is intact
// (no silent overwrite) and the user chooses which revision wins.
export const BlockEditorSaveConflictBanner = ({
  conflictingBlockCount,
  onKeepLocal,
  onUseRemote,
}: BlockEditorSaveConflictBannerProps) => {
  const { t } = useLingui();

  return (
    <StyledBannerWrapper>
      <Banner color="danger" variant="primary" className="">
        <StyledContent>
          <StyledMessages>
            <StyledTitle>
              {t`This document was changed elsewhere while you were editing`}
            </StyledTitle>
            <StyledDetail>
              {t`Your unsaved changes conflict with the saved version. Keep your version, or use the saved one.`}
            </StyledDetail>
            <StyledDetail>
              {t`Conflicting blocks: ${conflictingBlockCount}`}
            </StyledDetail>
          </StyledMessages>
          <StyledActions>
            <Button
              title={t`Use saved version`}
              variant="secondary"
              size="small"
              onClick={onUseRemote}
            />
            <Button
              title={t`Keep my changes`}
              variant="primary"
              size="small"
              onClick={onKeepLocal}
            />
          </StyledActions>
        </StyledContent>
      </Banner>
    </StyledBannerWrapper>
  );
};
