import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import {
  PRESENCE_CONNECTION_TTL_SECONDS,
  PRESENCE_KEY_PREFIX,
  PRESENCE_TYPING_TTL_SECONDS,
} from 'src/engine/core-modules/realtime-gateway/realtime-gateway.constants';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import {
  type PresenceEvent,
  type PresenceIdentity,
  type PresenceMember,
  presenceMemberSchema,
} from 'src/engine/core-modules/realtime-gateway/types/presence.type';

const PRESENCE_SCAN_COUNT = 100;

@Injectable()
export class PresenceService {
  constructor(
    private readonly redisClientService: RedisClientService,
    private readonly realtimePublisherService: RealtimePublisherService,
  ) {}

  async join(identity: PresenceIdentity): Promise<void> {
    const redisClient = this.redisClientService.getClient();
    const member = this.buildMember(identity);
    const presenceKey = this.getPresenceKey(
      identity.workspaceId,
      identity.userId,
    );
    const wasCreated =
      (await redisClient.set(
        presenceKey,
        JSON.stringify(member),
        'EX',
        PRESENCE_CONNECTION_TTL_SECONDS,
        'NX',
      )) === 'OK';

    if (!wasCreated) {
      await redisClient.set(
        presenceKey,
        JSON.stringify(member),
        'EX',
        PRESENCE_CONNECTION_TTL_SECONDS,
      );
    }

    await this.refreshConnection(identity);

    if (wasCreated) {
      await this.publish(identity.workspaceId, {
        event: 'join',
        member,
      });
    }
  }

  async heartbeat(identity: PresenceIdentity): Promise<void> {
    const member = this.buildMember(identity);

    await Promise.all([
      this.redisClientService
        .getClient()
        .set(
          this.getPresenceKey(identity.workspaceId, identity.userId),
          JSON.stringify(member),
          'EX',
          PRESENCE_CONNECTION_TTL_SECONDS,
        ),
      this.refreshConnection(identity),
    ]);
  }

  async leave(identity: PresenceIdentity): Promise<void> {
    const redisClient = this.redisClientService.getClient();
    const connectionKey = this.getConnectionKey(
      identity.workspaceId,
      identity.userId,
    );

    await redisClient.zrem(connectionKey, identity.connectionId);
    await redisClient.zremrangebyscore(connectionKey, '-inf', Date.now());

    if ((await redisClient.zcard(connectionKey)) > 0) {
      return;
    }

    const presenceKey = this.getPresenceKey(
      identity.workspaceId,
      identity.userId,
    );
    const wasOnline = (await redisClient.exists(presenceKey)) === 1;

    await redisClient.del(
      presenceKey,
      connectionKey,
      this.getTypingKey(identity.workspaceId, identity.userId),
    );

    if (wasOnline) {
      await this.publish(identity.workspaceId, {
        event: 'leave',
        member: this.buildMember(identity),
      });
    }
  }

  async setTyping(
    identity: PresenceIdentity,
    isTyping: boolean,
    typingContext?: string,
  ): Promise<void> {
    const redisClient = this.redisClientService.getClient();
    const typingKey = this.getTypingKey(identity.workspaceId, identity.userId);

    await this.heartbeat(identity);

    if (isTyping) {
      await redisClient.set(
        typingKey,
        JSON.stringify({ typingContext }),
        'EX',
        PRESENCE_TYPING_TTL_SECONDS,
      );
    } else {
      await redisClient.del(typingKey);
    }

    await this.publish(identity.workspaceId, {
      event: 'typing',
      member: this.buildMember(identity),
      isTyping,
      ...(isDefined(typingContext) ? { typingContext } : {}),
    });
  }

  async getWorkspaceRoster(workspaceId: string): Promise<PresenceMember[]> {
    const redisClient = this.redisClientService.getClient();
    const presenceKeys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        `${PRESENCE_KEY_PREFIX}:${workspaceId}:*`,
        'COUNT',
        PRESENCE_SCAN_COUNT,
      );

      cursor = nextCursor;
      presenceKeys.push(...keys);
    } while (cursor !== '0');

    if (presenceKeys.length === 0) {
      return [];
    }

    const storedMembers = await redisClient.mget(...presenceKeys);
    const members = storedMembers.flatMap((storedMember) => {
      if (!isDefined(storedMember)) {
        return [];
      }

      try {
        const parsedMember = presenceMemberSchema.safeParse(
          JSON.parse(storedMember),
        );

        return parsedMember.success ? [parsedMember.data] : [];
      } catch {
        return [];
      }
    });

    if (members.length === 0) {
      return [];
    }

    const typingValues = await redisClient.mget(
      ...members.map((member) => this.getTypingKey(workspaceId, member.userId)),
    );

    return members
      .map((member, index) => {
        const typingValue = typingValues[index];

        if (!isDefined(typingValue)) {
          return { ...member, isTyping: false };
        }

        try {
          const parsedTyping = JSON.parse(typingValue) as {
            typingContext?: unknown;
          };
          const typingContext =
            typeof parsedTyping.typingContext === 'string'
              ? parsedTyping.typingContext
              : undefined;

          return {
            ...member,
            isTyping: true,
            ...(isDefined(typingContext) ? { typingContext } : {}),
          };
        } catch {
          return { ...member, isTyping: false };
        }
      })
      .sort((firstMember, secondMember) =>
        secondMember.lastSeenAt.localeCompare(firstMember.lastSeenAt),
      );
  }

  private async refreshConnection(identity: PresenceIdentity): Promise<void> {
    const redisClient = this.redisClientService.getClient();
    const connectionKey = this.getConnectionKey(
      identity.workspaceId,
      identity.userId,
    );
    const expiresAt = Date.now() + PRESENCE_CONNECTION_TTL_SECONDS * 1000;

    await redisClient.zremrangebyscore(connectionKey, '-inf', Date.now());
    await redisClient.zadd(connectionKey, expiresAt, identity.connectionId);
    await redisClient.expire(connectionKey, PRESENCE_CONNECTION_TTL_SECONDS);
  }

  private buildMember(
    identity: PresenceIdentity,
  ): Omit<PresenceMember, 'isTyping' | 'typingContext'> {
    return {
      userId: identity.userId,
      ...(isDefined(identity.workspaceMemberId)
        ? { workspaceMemberId: identity.workspaceMemberId }
        : {}),
      lastSeenAt: new Date().toISOString(),
    };
  }

  private async publish(
    workspaceId: string,
    event: PresenceEvent,
  ): Promise<void> {
    await this.realtimePublisherService.publish(
      `workspace:${workspaceId}:presence`,
      event,
    );
  }

  private getPresenceKey(workspaceId: string, userId: string): string {
    return `${PRESENCE_KEY_PREFIX}:${workspaceId}:${userId}`;
  }

  private getConnectionKey(workspaceId: string, userId: string): string {
    return `${PRESENCE_KEY_PREFIX}-connections:${workspaceId}:${userId}`;
  }

  private getTypingKey(workspaceId: string, userId: string): string {
    return `${PRESENCE_KEY_PREFIX}-typing:${workspaceId}:${userId}`;
  }
}
