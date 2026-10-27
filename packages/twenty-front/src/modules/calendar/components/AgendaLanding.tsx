import { IconAgenda } from '@/a2e-workspace/components/A2eAppLogo';
import { A2eCustomizeAction } from '@/a2e-customize/components/A2eCustomizeAction';
import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import { AGENDA_LANDING_TEMPLATE_CATEGORY } from '@/calendar/constants/AgendaLandingTemplateCategory';
import { AGENDA_LANDING_TEMPLATE_LINKS } from '@/calendar/constants/AgendaLandingTemplates';
import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { IconFileText, IconPlus } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type AgendaLandingProps = {
  // Opens the host calendar's own create composer. The landing owns no event
  // state — it only offers the week's entry point, so the calendar page keeps
  // its single write path.
  onCreateEvent: () => void;
  // When the workspace has no events, the M7f strip becomes the M13c contextual
  // empty state (one sentence, one "New event", one "Use a template", one
  // "Learn more") instead of a header over an empty grid.
  isRecordEmpty?: boolean;
};

const StyledLanding = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h1`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[3]};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

// The Agenda home (M7f): the host `/calendar` page enriched with one primary
// action and three M9c starter templates, never a second navigation shell. The
// week view stays the page's own content below this strip, so the landing adds
// no calendar state and no parallel write path.
export const AgendaLanding = ({
  onCreateEvent,
  isRecordEmpty = false,
}: AgendaLandingProps) => {
  const { t } = useLingui();
  const { openTemplateGallery } = useOpenTemplateGallery();

  if (isRecordEmpty) {
    return (
      <A2eContextualEmptyState
        surfaceKey="agenda"
        onPrimaryAction={onCreateEvent}
      />
    );
  }

  return (
    <StyledLanding data-testid="agenda-landing">
      <StyledTitleGroup>
        <StyledTitle>
          <IconAgenda size={40} />
          {t`Agenda`}
        </StyledTitle>
        <StyledSubtitle>
          {t`Your week at a glance, with starters to shape it.`}
        </StyledSubtitle>
        <A2eLearnMoreLink appKey="agenda" />
      </StyledTitleGroup>
      <StyledActions>
        <A2eCustomizeAction objectNamePlural="calendarEvents" />
        {AGENDA_LANDING_TEMPLATE_LINKS.map((templateLink) => (
          <Button
            key={templateLink.descriptorKey}
            Icon={IconFileText}
            title={t(templateLink.label)}
            ariaLabel={t(templateLink.label)}
            variant="secondary"
            size="small"
            onClick={() =>
              openTemplateGallery({
                category: AGENDA_LANDING_TEMPLATE_CATEGORY,
                templateKey: templateLink.descriptorKey,
              })
            }
            dataTestId={`agenda-template-${templateLink.descriptorKey}`}
          />
        ))}
        <Button
          Icon={IconPlus}
          title={t`New event`}
          onClick={onCreateEvent}
          dataTestId="agenda-new-event"
        />
      </StyledActions>
    </StyledLanding>
  );
};
