import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import { In, Repository } from 'typeorm';

import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type CalendarChannelEventAssociationWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-channel-event-association.workspace-entity';
import { type CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import { resolveCalendarEventVisibility } from 'src/modules/calendar/common/utils/resolve-calendar-event-visibility.util';

@Injectable()
export class ApplyCalendarEventsVisibilityRestrictionsService {
  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    @InjectRepository(ConnectedAccountEntity)
    private readonly connectedAccountRepository: Repository<ConnectedAccountEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectRepository(CalendarChannelEntity)
    private readonly calendarChannelRepository: Repository<CalendarChannelEntity>,
  ) {}

  public async applyCalendarEventsVisibilityRestrictions(
    calendarEvents: CalendarEventWorkspaceEntity[],
    workspaceId: string,
    userId?: string,
    workspaceMemberId?: string,
  ) {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const calendarChannelEventAssociationRepository =
          this.workspaceOrmManager.getRepository<CalendarChannelEventAssociationWorkspaceEntity>(
            'calendarChannelEventAssociation',
          );

        const eventIds = calendarEvents.map((event) => event.id);

        const calendarChannelCalendarEventsAssociations =
          eventIds.length > 0
            ? await calendarChannelEventAssociationRepository.find({
                where: { calendarEventId: In(eventIds) },
              })
            : [];

        const calendarChannelIds = [
          ...new Set(
            calendarChannelCalendarEventsAssociations.map(
              (association) => association.calendarChannelId,
            ),
          ),
        ];

        const calendarChannelsFromCore =
          calendarChannelIds.length > 0
            ? await this.calendarChannelRepository.find({
                where: {
                  id: In(calendarChannelIds),
                  workspaceId,
                },
              })
            : [];

        const ownedConnectedAccountIds =
          await this.findOwnedConnectedAccountIds(userId, workspaceId);

        const eventIdsWithAssociation = new Set(
          calendarChannelCalendarEventsAssociations.map(
            (association) => association.calendarEventId,
          ),
        );

        const creatorWorkspaceMemberIdByEventId =
          await this.findCreatorWorkspaceMemberIdByEventId(
            eventIds.filter((eventId) => !eventIdsWithAssociation.has(eventId)),
          );

        for (let i = calendarEvents.length - 1; i >= 0; i--) {
          const event = calendarEvents[i];

          const eventAssociations =
            calendarChannelCalendarEventsAssociations.filter(
              (association) => association.calendarEventId === event.id,
            );

          const channelAccesses = eventAssociations
            .map((association) =>
              calendarChannelsFromCore.find(
                (channel) => channel.id === association.calendarChannelId,
              ),
            )
            .filter(isDefined)
            .map((channel) => ({
              visibility: channel.visibility,
              isOwnedByCurrentUser: ownedConnectedAccountIds.has(
                channel.connectedAccountId,
              ),
            }));

          const isCreatedByCurrentUser =
            isDefined(workspaceMemberId) &&
            creatorWorkspaceMemberIdByEventId.get(event.id) ===
              workspaceMemberId;

          const visibility = resolveCalendarEventVisibility({
            hasChannelAssociation: eventAssociations.length > 0,
            channelAccesses,
            isCreatedByCurrentUser,
          });

          if (visibility === 'FULL') {
            continue;
          }

          if (visibility === 'REDACTED') {
            calendarEvents[i].title =
              FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
            calendarEvents[i].description =
              FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
            continue;
          }

          calendarEvents.splice(i, 1);
        }

        return calendarEvents;
      },
      authContext,
      { lite: true },
    );
  }

  private async findOwnedConnectedAccountIds(
    userId: string | undefined,
    workspaceId: string,
  ): Promise<Set<string>> {
    if (!isDefined(userId)) {
      return new Set();
    }

    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
      select: ['id'],
    });

    if (!isDefined(userWorkspace)) {
      return new Set();
    }

    const connectedAccounts = await this.connectedAccountRepository.find({
      where: { userWorkspaceId: userWorkspace.id, workspaceId },
      select: { id: true },
    });

    return new Set(connectedAccounts.map((account) => account.id));
  }

  // Local events carry no channel association, so their creator (the owner) is
  // read from the record's created-by actor. Only fetched for those rows, and
  // through the ORM directly so the post-query hook cannot recurse into itself.
  private async findCreatorWorkspaceMemberIdByEventId(
    channelLessEventIds: string[],
  ): Promise<Map<string, string | null>> {
    if (channelLessEventIds.length === 0) {
      return new Map();
    }

    const calendarEventRepository =
      this.workspaceOrmManager.getRepository<CalendarEventWorkspaceEntity>(
        'calendarEvent',
      );

    const calendarEventsWithoutChannel = await calendarEventRepository.find({
      where: { id: In(channelLessEventIds) },
    });

    return new Map(
      calendarEventsWithoutChannel.map((calendarEvent) => [
        calendarEvent.id,
        calendarEvent.createdBy?.workspaceMemberId ?? null,
      ]),
    );
  }
}
