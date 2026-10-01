import { AGENDA_LANDING_TEMPLATE_CATEGORY } from '@/calendar/constants/AgendaLandingTemplateCategory';
import { AGENDA_LANDING_TEMPLATE_LINKS } from '@/calendar/constants/AgendaLandingTemplates';
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
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
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
export const AgendaLanding = ({ onCreateEvent }: AgendaLandingProps) => {
  const { t } = useLingui();
  const { openTemplateGallery } = useOpenTemplateGallery();

  return (
    <StyledLanding data-testid="agenda-landing">
      <StyledTitleGroup>
        <StyledTitle>{t`Agenda`}</StyledTitle>
        <StyledSubtitle>
          {t`Your week at a glance, with starters to shape it.`}
        </StyledSubtitle>
      </StyledTitleGroup>
      <StyledActions>
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
