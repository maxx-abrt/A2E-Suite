import { createReactInlineContentSpec } from '@blocknote/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Chip, ChipVariant } from 'twenty-ui/data-display';
import { IconCalendarEvent } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { getDateReminderMentionExportText } from '@/blocknote-editor/utils/getDateReminderMentionExportText';

const StyledDateReminderContainer = styled.span`
  display: inline;
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

// Read-only by design: the chip points at the Agenda event it created but never
// mutates it, so exports and prints render a plain date chip.
const DateReminderChip = ({ label }: { label: string }) => (
  <Chip
    label={label}
    variant={ChipVariant.Static}
    clickable={false}
    leftComponent={<IconCalendarEvent size={12} />}
  />
);

export const DateReminderInlineContent = createReactInlineContentSpec(
  {
    type: 'dateReminder' as const,
    propSchema: {
      calendarEventId: {
        default: '' as const,
      },
      startsAt: {
        default: '' as const,
      },
      label: {
        default: '' as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { label } = props.inlineContent.props;

      if (!isNonEmptyString(label)) {
        return (
          <Chip
            label={t`Date reminder`}
            variant={ChipVariant.Transparent}
            disabled
          />
        );
      }

      return (
        <StyledDateReminderContainer>
          <DateReminderChip label={label} />
        </StyledDateReminderContainer>
      );
    },
    // Markdown/DOCX cannot serialize the live chip, so it degrades to its date
    // label instead of a missing inline node.
    toExternalHTML: (props) => {
      const exportText = getDateReminderMentionExportText(
        props.inlineContent.props.label,
      );

      return <span>{exportText ?? ''}</span>;
    },
  },
);
