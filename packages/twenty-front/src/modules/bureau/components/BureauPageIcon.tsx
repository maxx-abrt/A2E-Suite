import { styled } from '@linaria/react';
import { useContext } from 'react';
import { IconFileText, useIcons } from 'twenty-ui/icon';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledIcon = styled.span`
  align-items: center;
  display: inline-flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.md};
  height: calc(${themeCssVariables.icon.size.lg} * 1px);
  justify-content: center;
  line-height: 1;
  width: calc(${themeCssVariables.icon.size.lg} * 1px);

  &[data-size='large'] {
    font-size: ${themeCssVariables.font.size.xl};
    height: ${themeCssVariables.spacing[8]};
    width: ${themeCssVariables.spacing[8]};
  }
`;

const TWENTY_ICON_NAME_PATTERN = /^Icon[A-Z0-9]/;

type BureauPageIconProps = {
  icon: string | null | undefined;
  size?: 'small' | 'large';
};

// Renders a page icon: an emoji (the a2e-documents convention), a twenty-ui
// icon name set elsewhere, or the neutral page glyph when none is set.
export const BureauPageIcon = ({ icon, size = 'small' }: BureauPageIconProps) => {
  const { theme } = useContext(ThemeContext);
  const { getIcon } = useIcons();
  const trimmedIcon = icon?.trim() ?? '';
  const iconSize = size === 'large' ? theme.icon.size.lg : theme.icon.size.md;

  if (trimmedIcon === '') {
    return (
      <StyledIcon data-size={size} aria-hidden="true">
        <IconFileText
          size={iconSize}
          stroke={theme.icon.stroke.sm}
          color={theme.font.color.tertiary}
        />
      </StyledIcon>
    );
  }

  if (TWENTY_ICON_NAME_PATTERN.test(trimmedIcon)) {
    const Icon = getIcon(trimmedIcon);

    return (
      <StyledIcon data-size={size} aria-hidden="true">
        <Icon
          size={iconSize}
          stroke={theme.icon.stroke.sm}
          color={theme.font.color.secondary}
        />
      </StyledIcon>
    );
  }

  return (
    <StyledIcon data-size={size} aria-hidden="true">
      {trimmedIcon}
    </StyledIcon>
  );
};
