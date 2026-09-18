import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useOpenChatChannelInSidePanel } from '@/chat/hooks/useOpenChatChannelInSidePanel';
import { useRecordChatChannels } from '@/chat/hooks/useRecordChatChannels';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { WidgetContentShell } from '@/page-layout/widgets/components/WidgetContentShell';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';

const StyledDiscussionsWidget = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledChannelRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledChannelName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

type DiscussionsWidgetProps = {
  widget: PageLayoutWidget;
};

// Record "discussions" tab: one channel per record through the a2e-chat
// relation, opened as the shared side-panel mini-chat. When the record has no
// channel yet, the tab provisions one (PROJECT-kind for projects, CUSTOM for
// the standard company record) instead of creating a parallel chat surface.
export const DiscussionsWidget = ({
  widget: _widget,
}: DiscussionsWidgetProps) => {
  const { t } = useLingui();
  const targetRecord = useTargetRecord();
  const objectNameSingular = targetRecord.targetObjectNameSingular;
  const recordId = targetRecord.id;

  const { recordChatChannel, provisionRecordChatChannel, loading } =
    useRecordChatChannels({ objectNameSingular, recordId });
  const { openChatChannelInSidePanel } = useOpenChatChannelInSidePanel();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const { record } = useFindOneRecord({
    objectNameSingular,
    objectRecordId: recordId,
    recordGqlFields: { id: true, name: true },
  });
  const recordName = typeof record?.name === 'string' ? record.name : '';

  const handleOpen = () => {
    if (!isDefined(recordChatChannel)) {
      return;
    }

    openChatChannelInSidePanel({
      channelId: recordChatChannel.id,
      channelName: recordChatChannel.name,
    });
  };

  const handleStartDiscussion = async () => {
    setIsProvisioning(true);
    const channel = await provisionRecordChatChannel({
      recordName,
    });
    setIsProvisioning(false);

    if (isDefined(channel)) {
      openChatChannelInSidePanel({
        channelId: channel.id,
        channelName: channel.name,
      });
    }
  };

  return (
    <WidgetContentShell>
      <StyledDiscussionsWidget data-testid="discussions-widget">
        {isDefined(recordChatChannel) ? (
          <StyledChannelRow>
            <StyledChannelName>{recordChatChannel.name}</StyledChannelName>
            <Button
              title={t`Open discussion`}
              variant="secondary"
              accent="blue"
              size="small"
              onClick={handleOpen}
            />
          </StyledChannelRow>
        ) : (
          <>
            <StyledHint>
              {loading ? null : t`No discussion on this record yet.`}
            </StyledHint>
            <Button
              title={t`Start a discussion`}
              variant="primary"
              accent="blue"
              size="small"
              disabled={isProvisioning}
              onClick={() => {
                void handleStartDiscussion();
              }}
            />
          </>
        )}
      </StyledDiscussionsWidget>
    </WidgetContentShell>
  );
};
