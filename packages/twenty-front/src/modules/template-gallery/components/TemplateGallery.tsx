import { TEMPLATE_GALLERY_CATEGORY_CONFIG } from '@/template-gallery/constants/TemplateGalleryCategoryConfig';
import { filterTemplateGalleryItems } from '@/template-gallery/utils/filterTemplateGalleryItems';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type TemplateDescriptorCategory,
  type TemplateDescriptorLabels,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  height: 100%;
  min-height: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSearchInput = styled.input`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledCategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledCategoryButton = styled.button<{ isSelected: boolean }>`
  align-items: center;
  background-color: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.blue
      : themeCssVariables.background.primary};
  border: 1px solid
    ${({ isSelected }) =>
      isSelected
        ? themeCssVariables.border.color.blue
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
`;

const StyledTemplateList = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  overflow-y: auto;
`;

const StyledTemplateButton = styled.button<{ isSelected: boolean }>`
  align-items: center;
  background-color: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.blue
      : themeCssVariables.background.primary};
  border: 1px solid
    ${({ isSelected }) =>
      isSelected
        ? themeCssVariables.border.color.blue
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;
`;

const StyledTemplateSourceLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledPreview = styled.div`
  background-color: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledPreviewTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledPreviewSectionLabel = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  text-transform: uppercase;
`;

const StyledPreviewWrite = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSafeState = styled.div`
  background-color: ${themeCssVariables.background.transparent.danger};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledMutedMessage = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledActionsRow = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPrimaryAction = styled.button`
  background-color: ${themeCssVariables.background.transparent.blue};
  border: 1px solid ${themeCssVariables.border.color.blue};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StyledSecondaryAction = styled.button`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

export type TemplateGalleryProps = {
  items: TemplateGalleryItem[];
  isLoading?: boolean;
  isApplying?: boolean;
  onUseTemplate: (item: TemplateGalleryItem) => void;
  onBlank: (item: TemplateGalleryItem) => void;
};

// The single host surface for content templates: category tabs, a search box,
// the template list and a preview pane. It is deliberately presentational —
// the data (installed apps' descriptors) and the apply/blank effects are owned
// by the host through `items` and the callbacks — so it stays unit-testable
// without Apollo or a live workspace.
export const TemplateGallery = ({
  items,
  isLoading = false,
  isApplying = false,
  onUseTemplate,
  onBlank,
}: TemplateGalleryProps) => {
  const { i18n, t } = useLingui();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateDescriptorCategory | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // The descriptors ship both labels; render the one matching the active
  // locale so the gallery is French in a French workspace without a second
  // translation layer on plain-string content. A descriptor is validated with
  // non-empty fr+en labels, but a null locale falls back to French, the suite
  // source language.
  const isEnglishLocale = isNonEmptyString(i18n.locale)
    ? i18n.locale.toLowerCase().startsWith('en')
    : false;

  const localize = (labels: TemplateDescriptorLabels): string =>
    isEnglishLocale ? labels.en : labels.fr;

  const presentCategories = useMemo(() => {
    const availableCategories = new Set(
      items.map((item) => item.descriptor.category),
    );

    return (
      Object.keys(
        TEMPLATE_GALLERY_CATEGORY_CONFIG,
      ) as TemplateDescriptorCategory[]
    ).filter((category) => availableCategories.has(category));
  }, [items]);

  const visibleItems = useMemo(
    () =>
      filterTemplateGalleryItems({
        items,
        category: selectedCategory,
        search,
      }),
    [items, selectedCategory, search],
  );

  const selectedItem =
    visibleItems.find((item) => item.descriptor.key === selectedKey) ??
    visibleItems[0] ??
    null;

  const renderCategoryButton = (
    category: TemplateDescriptorCategory,
  ): ReactNode => {
    const { Icon, label } = TEMPLATE_GALLERY_CATEGORY_CONFIG[category];

    return (
      <StyledCategoryButton
        key={category}
        type="button"
        isSelected={selectedCategory === category}
        aria-pressed={selectedCategory === category}
        onClick={() =>
          setSelectedCategory((currentCategory) =>
            currentCategory === category ? null : category,
          )
        }
      >
        <Icon size={themeCssVariables.icon.size.sm} />
        {t(label)}
      </StyledCategoryButton>
    );
  };

  return (
    <StyledContainer>
      <StyledSearchInput
        type="text"
        aria-label={t`Search templates`}
        placeholder={t`Search templates`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {presentCategories.length > 0 && (
        <StyledCategoryRow>
          {presentCategories.map(renderCategoryButton)}
        </StyledCategoryRow>
      )}
      <StyledBody>
        <StyledTemplateList>
          {isLoading && <StyledMutedMessage>{t`Loading…`}</StyledMutedMessage>}
          {!isLoading && visibleItems.length === 0 && (
            <StyledMutedMessage>{t`No templates found`}</StyledMutedMessage>
          )}
          {!isLoading &&
            visibleItems.map((item) => {
              const isSelected =
                selectedItem?.descriptor.key === item.descriptor.key;

              return (
                <StyledTemplateButton
                  key={item.descriptor.key}
                  type="button"
                  isSelected={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedKey(item.descriptor.key)}
                >
                  {localize(item.descriptor.labels)}
                  <StyledTemplateSourceLabel>
                    {item.sourceApplication.name}
                  </StyledTemplateSourceLabel>
                </StyledTemplateButton>
              );
            })}
        </StyledTemplateList>
        {isDefined(selectedItem) && (
          <StyledPreview data-testid="template-gallery-preview">
            <StyledPreviewTitle>
              {localize(selectedItem.descriptor.labels)}
            </StyledPreviewTitle>
            {!selectedItem.available && (
              <StyledSafeState>
                {t`This template needs an app that is not installed.`}
              </StyledSafeState>
            )}
            {selectedItem.descriptor.preview.length > 0 && (
              <>
                <StyledPreviewSectionLabel>
                  {t`What it creates`}
                </StyledPreviewSectionLabel>
                {selectedItem.descriptor.preview.map((write) => (
                  <StyledPreviewWrite key={`${write.object}-${write.count}`}>
                    {localize(write.summary)}
                  </StyledPreviewWrite>
                ))}
              </>
            )}
            {selectedItem.descriptor.inputs.length > 0 && (
              <>
                <StyledPreviewSectionLabel>
                  {t`Fields`}
                </StyledPreviewSectionLabel>
                {selectedItem.descriptor.inputs.map((input) => (
                  <StyledPreviewWrite key={input.key}>
                    {localize(input.label)}
                  </StyledPreviewWrite>
                ))}
              </>
            )}
            <StyledActionsRow>
              <StyledPrimaryAction
                type="button"
                disabled={!selectedItem.available || isApplying}
                onClick={() => onUseTemplate(selectedItem)}
              >
                {t`Use template`}
              </StyledPrimaryAction>
              <StyledSecondaryAction
                type="button"
                onClick={() => onBlank(selectedItem)}
              >
                {t`Blank`}
              </StyledSecondaryAction>
            </StyledActionsRow>
          </StyledPreview>
        )}
      </StyledBody>
    </StyledContainer>
  );
};
