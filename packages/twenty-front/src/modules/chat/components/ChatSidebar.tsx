import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconLock, IconMessage } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { isChatChannelUnread } from '@/chat/utils/getChatReadState';
import {
  type ChatChannelKind,
  type ChatChannelSection,
} from '@/chat/types/ChatChannel';

const StyledSidebar = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
  width: 240px;
`;

const StyledSidebarTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  padding: ${themeCssVariables.spacing[1]};
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledSectionTitle = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  padding: ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

const StyledChannelButton = styled.button<{ isSelected: boolean }>`
  align-items: center;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledChannelName = styled.span<{ isUnread: boolean }>`
  flex: 1;
  font-weight: ${({ isUnread }) =>
    isUnread
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledUnreadBadge = styled.span`
  background: ${themeCssVariables.color.blue};
  border-radius: 999px;
  color: ${themeCssVariables.font.color.inverted};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 16px;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

export type ChatSidebarProps = {
  sections: ChatChannelSection[];
  selectedChannelId: string | null;
  unreadCountByChannelId: Record<string, number>;
  onSelectChannel: (channelId: string) => void;
};

export const ChatSidebar = ({
  sections,
  selectedChannelId,
  unreadCountByChannelId,
  onSelectChannel,
}: ChatSidebarProps) => {
  const { t } = useLingui();

  const getSectionLabel = (kind: ChatChannelKind) => {
    switch (kind) {
      case 'WORKSPACE':
        return t`Workspace`;
      case 'PROJECT':
        return t`Projects`;
      case 'CUSTOM':
        return t`Custom`;
    }
  };

  return (
    <StyledSidebar data-testid="chat-sidebar">
      <StyledSidebarTitle>{t`Channels`}</StyledSidebarTitle>
      {sections.length === 0 ? (
        <StyledEmptyState>{t`No channels yet`}</StyledEmptyState>
      ) : (
        sections.map((section) => (
          <StyledSection
            key={section.kind}
            data-testid={`chat-section-${section.kind}`}
          >
            <StyledSectionTitle>
              {getSectionLabel(section.kind)}
            </StyledSectionTitle>
            {section.channels.map((channel) => {
              const unreadCount = unreadCountByChannelId[channel.id] ?? 0;
              const isUnread = isChatChannelUnread(unreadCount);

              return (
                <StyledChannelButton
                  key={channel.id}
                  type="button"
                  isSelected={channel.id === selectedChannelId}
                  aria-current={channel.id === selectedChannelId}
                  data-testid={`chat-channel-item-${channel.id}`}
                  onClick={() => onSelectChannel(channel.id)}
                >
                  {channel.visibility === 'PRIVATE' ? (
                    <IconLock size={16} />
                  ) : (
                    <IconMessage size={16} />
                  )}
                  <StyledChannelName isUnread={isUnread}>
                    {channel.name}
                  </StyledChannelName>
                  {isUnread && (
                    <StyledUnreadBadge
                      data-testid={`chat-channel-unread-${channel.id}`}
                    >
                      {unreadCount}
                    </StyledUnreadBadge>
                  )}
                </StyledChannelButton>
              );
            })}
          </StyledSection>
        ))
      )}
    </StyledSidebar>
  );
};
