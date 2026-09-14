import { A2eWorkspaceTemplatePreview } from '@/a2e-workspace/components/A2eWorkspaceTemplatePreview';
import { type A2eWorkspaceTemplateOption } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  width: 100%;
`;

const StyledCard = styled.button<{ isSelected: boolean }>`
  align-items: flex-start;
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
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  transition:
    background-color 100ms ease,
    border-color 100ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.blue};
  }
`;

const StyledCardIcon = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

const StyledCardLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledCardDescription = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
`;

export type A2eWorkspaceTemplatePickerProps = {
  options: A2eWorkspaceTemplateOption[];
  // Set by the onboarding flow so a freshly created workspace shows a
  // template as active before the user picks one (defaults mirror the server
  // default of no template == CRM-only).
  onApplied?: () => void;
};

export const A2eWorkspaceTemplatePicker = ({
  options,
  onApplied,
}: A2eWorkspaceTemplatePickerProps) => {
  const { t } = useLingui();
  const [selectedTemplate, setSelectedTemplate] = useState<
    A2eWorkspaceTemplateOption['value'] | null
  >(null);

  // Both entrypoints (onboarding picker and Settings section) render through
  // the same preview + operation flow so the server applies one operation
  // contract everywhere.
  return (
    <>
      <StyledGrid>
        {options.map((option) => {
          const isSelected = selectedTemplate === option.value;
          const { Icon } = option;

          return (
            <StyledCard
              key={option.value}
              isSelected={isSelected}
              type="button"
              onClick={() => setSelectedTemplate(option.value)}
            >
              <StyledCardIcon>
                <Icon size={themeCssVariables.icon.size.md} />
              </StyledCardIcon>
              <StyledCardLabel>{t(option.label)}</StyledCardLabel>
              <StyledCardDescription>
                {t(option.description)}
              </StyledCardDescription>
            </StyledCard>
          );
        })}
      </StyledGrid>
      {isDefined(selectedTemplate) && (
        <A2eWorkspaceTemplatePreview
          template={selectedTemplate}
          onApplied={onApplied}
        />
      )}
    </>
  );
};
