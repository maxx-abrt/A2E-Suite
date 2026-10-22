import { BUREAU_PAGE_ICON_CHOICES } from '@/bureau/constants/BureauPageIconChoices';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledPickerHeader = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  justify-content: space-between;
  min-height: ${themeCssVariables.spacing[6]};
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[0.5]};
  grid-template-columns: repeat(8, 1fr);
`;

const StyledEmojiButton = styled.button`
  align-items: center;
  aspect-ratio: 1;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.xl};
  justify-content: center;
  padding: 0;
  transition: background calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.medium};
    outline: none;
  }

  &[data-selected='true'] {
    background: ${themeCssVariables.background.transparent.blue};
  }
`;

type BureauIconPickerProps = {
  dropdownId: string;
  clickableComponent: ReactNode;
  currentIcon: string | null;
  onSelect: (icon: string | null) => void;
};

export const BureauIconPicker = ({
  dropdownId,
  clickableComponent,
  currentIcon,
  onSelect,
}: BureauIconPickerProps) => {
  const { t } = useLingui();
  const { closeDropdown } = useCloseDropdown();

  const select = (icon: string | null) => {
    closeDropdown(dropdownId);
    onSelect(icon);
  };

  return (
    <Dropdown
      dropdownId={dropdownId}
      dropdownPlacement="bottom-start"
      clickableComponent={clickableComponent}
      dropdownComponents={
        <DropdownContent widthInPixels={GenericDropdownContentWidth.ExtraLarge}>
          <StyledPicker data-testid="bureau-icon-picker">
            <StyledPickerHeader>
              <span>{t`Page icon`}</span>
              {currentIcon ? (
                <Button
                  title={t`Remove`}
                  size="small"
                  variant="tertiary"
                  onClick={() => select(null)}
                  dataTestId="bureau-icon-picker-remove"
                />
              ) : null}
            </StyledPickerHeader>
            <StyledGrid>
              {BUREAU_PAGE_ICON_CHOICES.map((emoji) => (
                <StyledEmojiButton
                  key={emoji}
                  type="button"
                  aria-label={emoji}
                  data-selected={emoji === currentIcon}
                  data-testid={`bureau-icon-option-${emoji}`}
                  onClick={() => select(emoji)}
                >
                  {emoji}
                </StyledEmojiButton>
              ))}
            </StyledGrid>
          </StyledPicker>
        </DropdownContent>
      }
    />
  );
};
