import { RealtimePresenceAvatarStack } from '@/realtime/components/RealtimePresenceAvatarStack';
import { RealtimeTypingIndicator } from '@/realtime/components/RealtimeTypingIndicator';
import { useWorkspacePresence } from '@/realtime/hooks/useWorkspacePresence';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type WorkbenchWidgetDefinition } from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

const StyledWidgetBody = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: center;
  min-height: 180px;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledWidgetIcon = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.rounded};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  height: 48px;
  justify-content: center;
  width: 48px;
`;

const StyledWidgetTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledWidgetDescription = styled.div`
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  max-width: 240px;
`;

const StyledPresenceContent = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const getWorkbenchWidgetTitle = (
  id: string,
  translate: ReturnType<typeof useLingui>['t'],
) => {
  switch (id) {
    case 'inbox':
      return translate`Inbox`;
    case 'assistant':
      return translate`Syna assistant`;
    case 'comments':
      return translate`Comments`;
    case 'tasks':
      return translate`Tasks`;
    case 'activity':
      return translate`Activity`;
    case 'presence':
      return translate`People online`;
    default:
      return id;
  }
};

export const DefaultWorkbenchWidgetContent = ({
  definition,
}: {
  definition: WorkbenchWidgetDefinition;
}) => {
  const { t } = useLingui();
  const { onlineWorkspaceMembers, typingWorkspaceMembers } =
    useWorkspacePresence();
  const title = getWorkbenchWidgetTitle(definition.id, t);
  const description = (() => {
    switch (definition.id) {
      case 'inbox':
        return t`No unread items in this view.`;
      case 'assistant':
        return t`Install or configure Syna to ask questions from any workspace context.`;
      case 'comments':
        return t`Open a record or document to see its discussion here.`;
      case 'tasks':
        return t`No active tasks in this view.`;
      case 'activity':
        return t`Workspace activity will appear here as your team works.`;
      case 'presence':
        return onlineWorkspaceMembers.length === 0
          ? t`No other collaborators are online right now.`
          : t`${onlineWorkspaceMembers.length} collaborators online`;
      default:
        return t`This widget is ready for its app provider.`;
    }
  })();

  return (
    <StyledWidgetBody data-testid={`workbench-widget-${definition.id}`}>
      <StyledWidgetIcon aria-hidden="true">
        <definition.Icon size={24} stroke={1.5} />
      </StyledWidgetIcon>
      <StyledPresenceContent>
        <StyledWidgetTitle>{title}</StyledWidgetTitle>
        {definition.id === 'presence' && (
          <>
            <RealtimePresenceAvatarStack
              workspaceMembers={onlineWorkspaceMembers}
            />
            <RealtimeTypingIndicator
              workspaceMembers={typingWorkspaceMembers}
            />
          </>
        )}
        <StyledWidgetDescription>{description}</StyledWidgetDescription>
      </StyledPresenceContent>
    </StyledWidgetBody>
  );
};
