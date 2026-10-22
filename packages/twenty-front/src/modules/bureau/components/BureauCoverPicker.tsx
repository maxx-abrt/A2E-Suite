import { BUREAU_COVER_COLOR_CHOICES } from '@/bureau/constants/BureauCoverColorChoices';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSwatches = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, 1fr);
`;

const StyledSwatch = styled.button`
  border: 2px solid transparent;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  height: ${themeCssVariables.spacing[8]};
  padding: 0;
  transition: transform calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;

  &:hover,
  &:focus-visible {
    outline: none;
    transform: scale(1.05);
  }

  &[data-selected='true'] {
    border-color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  height: ${themeCssVariables.spacing[8]};
  outline: none;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;

  &:focus {
    border-color: ${themeCssVariables.border.color.blue};
  }

  &[aria-invalid='true'] {
    border-color: ${themeCssVariables.border.color.danger};
  }
`;

const StyledError = styled.span`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledFooter = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

type BureauCoverPickerProps = {
  dropdownId: string;
  clickableComponent: ReactNode;
  coverColor: string | null;
  coverImage: string | null;
  onChange: (cover: {
    coverColor: string | null;
    coverImage: string | null;
  }) => void;
};

export const BureauCoverPicker = ({
  dropdownId,
  clickableComponent,
  coverColor,
  coverImage,
  onChange,
}: BureauCoverPickerProps) => {
  const { t } = useLingui();
  const { closeDropdown } = useCloseDropdown();
  const [imageUrlDraft, setImageUrlDraft] = useState(coverImage ?? '');
  const [hasInvalidUrl, setHasInvalidUrl] = useState(false);

  const applyCover = (cover: {
    coverColor: string | null;
    coverImage: string | null;
  }) => {
    closeDropdown(dropdownId);
    onChange(cover);
  };

  const submitImageUrl = () => {
    const imageUrl = imageUrlDraft.trim();

    if (!isHttpUrl(imageUrl)) {
      setHasInvalidUrl(true);

      return;
    }

    applyCover({ coverColor, coverImage: imageUrl });
  };

  const handleImageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitImageUrl();
  };

  return (
    <Dropdown
      dropdownId={dropdownId}
      dropdownPlacement="bottom-end"
      clickableComponent={clickableComponent}
      dropdownComponents={
        <DropdownContent widthInPixels={GenericDropdownContentWidth.ExtraLarge}>
          <StyledPicker data-testid="bureau-cover-picker">
            <StyledLabel>{t`Color`}</StyledLabel>
            <StyledSwatches>
              {BUREAU_COVER_COLOR_CHOICES.map((color) => (
                <StyledSwatch
                  key={color}
                  type="button"
                  aria-label={t`Use color ${color}`}
                  data-selected={coverImage === null && coverColor === color}
                  data-testid={`bureau-cover-color-${color}`}
                  style={{ background: color }}
                  onClick={() =>
                    applyCover({ coverColor: color, coverImage: null })
                  }
                />
              ))}
            </StyledSwatches>
            <StyledForm onSubmit={handleImageSubmit}>
              <StyledLabel>{t`Image link`}</StyledLabel>
              <StyledInput
                value={imageUrlDraft}
                placeholder="https://…"
                aria-label={t`Image link`}
                aria-invalid={hasInvalidUrl}
                data-testid="bureau-cover-image-input"
                onChange={(event) => {
                  setImageUrlDraft(event.target.value);
                  setHasInvalidUrl(false);
                }}
              />
              {hasInvalidUrl ? (
                <StyledError>{t`Enter a valid http(s) image link.`}</StyledError>
              ) : null}
              <StyledFooter>
                <Button
                  title={t`Remove cover`}
                  size="small"
                  variant="tertiary"
                  onClick={() =>
                    applyCover({ coverColor: null, coverImage: null })
                  }
                  dataTestId="bureau-cover-remove"
                />
                <Button
                  title={t`Use image`}
                  size="small"
                  accent="blue"
                  onClick={submitImageUrl}
                  dataTestId="bureau-cover-image-submit"
                />
              </StyledFooter>
            </StyledForm>
          </StyledPicker>
        </DropdownContent>
      }
    />
  );
};
