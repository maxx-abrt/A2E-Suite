import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, useState } from 'react';
import { type TemplateDescriptorLabels } from 'twenty-shared/application';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconFileText,
  IconLayoutGrid,
  IconSquarePlus,
  type IconComponent,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type CreateChooserProps = {
  suggestions: TemplateGalleryItem[];
  onBlank: () => void;
  onSelectSuggestion: (item: TemplateGalleryItem) => void;
  onBrowseAll: () => void;
};

type CreateChooserOption =
  | { kind: 'blank'; Icon: IconComponent; label: string; testId: string }
  | {
      kind: 'suggestion';
      Icon: IconComponent;
      label: string;
      testId: string;
      item: TemplateGalleryItem;
    }
  | { kind: 'browse-all'; Icon: IconComponent; label: string; testId: string };

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  outline: none;
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0 ${themeCssVariables.spacing[2]};
  text-transform: uppercase;
`;

const StyledOption = styled.button<{ isHighlighted: boolean }>`
  align-items: center;
  background-color: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.background.transparent.blue
      : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;
`;

const StyledOptionLabel = styled.span`
  flex: 1;
`;

// The reusable per-surface create chooser (PLAN M13a): Blank · the surface's
// three context-aware suggestions · Browse all. Blank is the default highlight
// so Enter means "create blank" exactly as the PLAN states; the arrow keys walk
// the list so a suggestion is reachable without a pointer. The component is
// presentational — the surface owns the real create action, the gallery preselect
// and the modal, so the same chooser serves every "New".
export const CreateChooser = ({
  suggestions,
  onBlank,
  onSelectSuggestion,
  onBrowseAll,
}: CreateChooserProps) => {
  const { i18n, t } = useLingui();
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const isEnglishLocale = isNonEmptyString(i18n.locale)
    ? i18n.locale.toLowerCase().startsWith('en')
    : false;

  const localize = (labels: TemplateDescriptorLabels): string =>
    isEnglishLocale ? labels.en : labels.fr;

  const options: CreateChooserOption[] = [
    {
      kind: 'blank',
      Icon: IconSquarePlus,
      label: t`Blank`,
      testId: 'create-chooser-blank',
    },
    ...suggestions.map((item) => ({
      kind: 'suggestion' as const,
      Icon: IconFileText,
      label: localize(item.descriptor.labels),
      testId: `create-chooser-suggestion-${item.descriptor.key}`,
      item,
    })),
    {
      kind: 'browse-all',
      Icon: IconLayoutGrid,
      label: t`Browse all`,
      testId: 'create-chooser-browse-all',
    },
  ];

  const activateOption = (option: CreateChooserOption) => {
    switch (option.kind) {
      case 'blank':
        onBlank();
        return;
      case 'suggestion':
        onSelectSuggestion(option.item);
        return;
      case 'browse-all':
        onBrowseAll();
        return;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((currentIndex) =>
        Math.min(currentIndex + 1, options.length - 1),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      activateOption(options[highlightedIndex]);
    }
  };

  return (
    <StyledContainer
      role="listbox"
      aria-label={t`Create`}
      tabIndex={0}
      autoFocus
      data-testid="create-chooser"
      onKeyDown={handleKeyDown}
    >
      <StyledTitle>{t`Create`}</StyledTitle>
      {options.map((option, index) => (
        <StyledOption
          key={option.testId}
          type="button"
          role="option"
          aria-selected={index === highlightedIndex}
          isHighlighted={index === highlightedIndex}
          data-testid={option.testId}
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => activateOption(option)}
        >
          <option.Icon size={themeCssVariables.icon.size.sm} />
          <StyledOptionLabel>{option.label}</StyledOptionLabel>
        </StyledOption>
      ))}
    </StyledContainer>
  );
};
