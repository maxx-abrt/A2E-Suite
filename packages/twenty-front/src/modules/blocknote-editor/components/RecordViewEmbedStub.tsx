import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { IconLock } from 'twenty-ui/icon';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledStub = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[2]} 0;
  padding: ${themeCssVariables.spacing[3]};
`;

type RecordViewEmbedStubProps = {
  variant: 'denied' | 'unavailable';
  objectLabel?: string;
};

// The one place an embedded view degrades: permission denial and missing
// view/object both render here, so no raw error or record data escapes.
export const RecordViewEmbedStub = ({
  variant,
  objectLabel,
}: RecordViewEmbedStubProps) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useLingui();

  return (
    <StyledStub contentEditable={false}>
      <IconLock size={theme.icon.size.sm} />
      {variant === 'denied' ? (
        objectLabel ? (
          <span>
            {t`You do not have permission to view the ${objectLabel} object`}
          </span>
        ) : (
          <Trans>You do not have permission to view this data</Trans>
        )
      ) : (
        <Trans>This embedded view is not available</Trans>
      )}
    </StyledStub>
  );
};
