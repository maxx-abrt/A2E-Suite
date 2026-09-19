import { useMemo, useState } from 'react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconRestore, IconX } from 'twenty-ui/icon';
import { Button, IconButton, SearchInput } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type FirstOpenHelpLaunchAction,
  type FirstOpenHelpContext,
} from '@/first-open-help/constants/FirstOpenHelpLaunchActions';
import { FIRST_OPEN_HELP_TOPIC_KIND_LABELS } from '@/first-open-help/constants/FirstOpenHelpTopicKindLabels';
import { type FirstOpenHelpTopic } from '@/first-open-help/types/FirstOpenHelpTopic';
import {
  buildSearchableFirstOpenHelpTopics,
  searchFirstOpenHelpTopics,
} from '@/first-open-help/utils/searchFirstOpenHelpTopics';

const StyledPanel = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledActionButton = styled.button`
  align-items: flex-start;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  text-align: left;
  transition: border-color 100ms ease;

  &:hover {
    border-color: ${themeCssVariables.border.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const StyledActionIcon = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  padding-top: 2px;
`;

const StyledActionBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledActionLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledActionDescription = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.4;
`;

const StyledTopicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTopicCard = styled.article`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTopicHeader = styled.header`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledTopicKind = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StyledTopicTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledTopicBody = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} 0;
`;

export type FirstOpenHelpPanelProps = {
  context: FirstOpenHelpContext;
  launchActions: FirstOpenHelpLaunchAction[];
  topics: FirstOpenHelpTopic[];
  dismissedTopicIds: string[];
  onDismissTopic: (topicId: string) => void;
  onRestoreTopic: (topicId: string) => void;
  onRestoreAllTopics: () => void;
  onSelectLaunchAction: (action: FirstOpenHelpLaunchAction) => void;
};

export const FirstOpenHelpPanel = ({
  context,
  launchActions,
  topics,
  dismissedTopicIds,
  onDismissTopic,
  onRestoreTopic,
  onRestoreAllTopics,
  onSelectLaunchAction,
}: FirstOpenHelpPanelProps) => {
  const { t } = useLingui();
  const [searchQuery, setSearchQuery] = useState('');

  const dismissedTopicIdSet = useMemo(
    () => new Set(dismissedTopicIds),
    [dismissedTopicIds],
  );

  const searchableTopics = useMemo(
    () => buildSearchableFirstOpenHelpTopics(topics, t),
    [topics, t],
  );

  const isSearching = searchQuery.trim().length > 0;
  const matchingTopics = searchFirstOpenHelpTopics(
    searchableTopics,
    searchQuery,
  );
  // Searching deliberately surfaces dismissed explanations too, so the panel
  // stays a complete reference once a user has hidden the first-open copy.
  const visibleTopics = isSearching
    ? matchingTopics
    : matchingTopics.filter((topic) => !dismissedTopicIdSet.has(topic.id));

  return (
    <StyledPanel data-testid="first-open-help" data-context={context}>
      {launchActions.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>{t`Get started`}</StyledSectionTitle>
          <StyledActionList>
            {launchActions.map((launchAction) => (
              <StyledActionButton
                key={launchAction.id}
                type="button"
                data-testid={`first-open-help-action-${launchAction.id}`}
                onClick={() => onSelectLaunchAction(launchAction)}
              >
                <StyledActionIcon aria-hidden="true">
                  <launchAction.Icon size={16} />
                </StyledActionIcon>
                <StyledActionBody>
                  <StyledActionLabel>{t(launchAction.label)}</StyledActionLabel>
                  <StyledActionDescription>
                    {t(launchAction.description)}
                  </StyledActionDescription>
                </StyledActionBody>
              </StyledActionButton>
            ))}
          </StyledActionList>
        </StyledSection>
      )}

      <StyledSection>
        <StyledSectionTitle>{t`Help`}</StyledSectionTitle>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t`Search help`}
          aria-label={t`Search help`}
        />
        {visibleTopics.length === 0 ? (
          <StyledEmptyState data-testid="first-open-help-empty">
            {isSearching
              ? t`No help topic matches your search.`
              : t`Every explanation is hidden. Restore them to read again.`}
          </StyledEmptyState>
        ) : (
          <StyledTopicList>
            {visibleTopics.map((topic) => {
              const isDismissed = dismissedTopicIdSet.has(topic.id);

              return (
                <StyledTopicCard
                  key={topic.id}
                  data-testid={`first-open-help-topic-${topic.id}`}
                >
                  <StyledTopicHeader>
                    <StyledTopicKind>
                      {t(FIRST_OPEN_HELP_TOPIC_KIND_LABELS[topic.kind])}
                    </StyledTopicKind>
                    {isDismissed ? (
                      <IconButton
                        Icon={IconRestore}
                        dataTestId={`first-open-help-restore-${topic.id}`}
                        ariaLabel={t`Restore explanation`}
                        size="small"
                        variant="tertiary"
                        accent="default"
                        onClick={() => onRestoreTopic(topic.id)}
                      />
                    ) : (
                      <IconButton
                        Icon={IconX}
                        dataTestId={`first-open-help-dismiss-${topic.id}`}
                        ariaLabel={t`Dismiss explanation`}
                        size="small"
                        variant="tertiary"
                        accent="default"
                        onClick={() => onDismissTopic(topic.id)}
                      />
                    )}
                  </StyledTopicHeader>
                  <StyledTopicTitle>{t(topic.title)}</StyledTopicTitle>
                  <StyledTopicBody>{t(topic.body)}</StyledTopicBody>
                </StyledTopicCard>
              );
            })}
          </StyledTopicList>
        )}
        {!isSearching && dismissedTopicIds.length > 0 && (
          <Button
            Icon={IconRestore}
            title={t`Restore hidden explanations`}
            variant="secondary"
            size="small"
            dataTestId="first-open-help-restore-all"
            onClick={onRestoreAllTopics}
          />
        )}
      </StyledSection>
    </StyledPanel>
  );
};
