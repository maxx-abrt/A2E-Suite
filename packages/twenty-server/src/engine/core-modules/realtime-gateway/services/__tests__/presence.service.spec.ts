import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const WORKSPACE_MEMBER_ID = '20202020-3957-4908-9c36-2929a23f8353';

const identity = {
  workspaceId: WORKSPACE_ID,
  userId: USER_ID,
  workspaceMemberId: WORKSPACE_MEMBER_ID,
  connectionId: 'connection-1',
};

const createService = () => {
  const redisClient = {
    set: jest.fn(),
    zremrangebyscore: jest.fn().mockResolvedValue(0),
    zadd: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    zrem: jest.fn().mockResolvedValue(1),
    zcard: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    mget: jest.fn().mockResolvedValue([]),
  };
  const publisherService = {
    publish: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PresenceService(
    { getClient: () => redisClient } as unknown as RedisClientService,
    publisherService as unknown as RealtimePublisherService,
  );

  return { redisClient, publisherService, service };
};

describe('PresenceService', () => {
  it('stores a TTL presence record and publishes join only for the first connection', async () => {
    const { redisClient, publisherService, service } = createService();

    redisClient.set.mockResolvedValueOnce('OK');

    await service.join(identity);

    expect(redisClient.set).toHaveBeenCalledWith(
      `presence:${WORKSPACE_ID}:${USER_ID}`,
      expect.any(String),
      'EX',
      45,
      'NX',
    );
    expect(redisClient.zadd).toHaveBeenCalledWith(
      `presence-connections:${WORKSPACE_ID}:${USER_ID}`,
      expect.any(Number),
      identity.connectionId,
    );
    expect(publisherService.publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:presence`,
      expect.objectContaining({ event: 'join' }),
    );
  });

  it('keeps a user online while another live connection remains', async () => {
    const { redisClient, publisherService, service } = createService();

    redisClient.zcard.mockResolvedValue(1);

    await service.leave(identity);

    expect(redisClient.del).not.toHaveBeenCalled();
    expect(publisherService.publish).not.toHaveBeenCalled();
  });

  it('removes the final connection and publishes leave', async () => {
    const { redisClient, publisherService, service } = createService();

    await service.leave(identity);

    expect(redisClient.del).toHaveBeenCalledWith(
      `presence:${WORKSPACE_ID}:${USER_ID}`,
      `presence-connections:${WORKSPACE_ID}:${USER_ID}`,
      `presence-typing:${WORKSPACE_ID}:${USER_ID}`,
    );
    expect(publisherService.publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:presence`,
      expect.objectContaining({ event: 'leave' }),
    );
  });

  it('publishes typing state and exposes it in the roster', async () => {
    const { redisClient, publisherService, service } = createService();
    const storedMember = JSON.stringify({
      userId: USER_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      lastSeenAt: '2026-09-09T12:00:00.000Z',
    });

    redisClient.set.mockResolvedValue('OK');

    await service.setTyping(identity, true, 'record:company:1');

    expect(publisherService.publish).toHaveBeenLastCalledWith(
      `workspace:${WORKSPACE_ID}:presence`,
      expect.objectContaining({
        event: 'typing',
        isTyping: true,
        typingContext: 'record:company:1',
      }),
    );

    redisClient.scan.mockResolvedValue([
      '0',
      [`presence:${WORKSPACE_ID}:${USER_ID}`],
    ]);
    redisClient.mget
      .mockResolvedValueOnce([storedMember])
      .mockResolvedValueOnce([
        JSON.stringify({ typingContext: 'record:company:1' }),
      ]);

    await expect(service.getWorkspaceRoster(WORKSPACE_ID)).resolves.toEqual([
      {
        userId: USER_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        lastSeenAt: '2026-09-09T12:00:00.000Z',
        isTyping: true,
        typingContext: 'record:company:1',
      },
    ]);
  });

  it('ignores expired and malformed presence records while hydrating', async () => {
    const { redisClient, service } = createService();

    redisClient.scan.mockResolvedValue([
      '0',
      [
        `presence:${WORKSPACE_ID}:${USER_ID}`,
        `presence:${WORKSPACE_ID}:expired`,
        `presence:${WORKSPACE_ID}:malformed`,
      ],
    ]);
    redisClient.mget
      .mockResolvedValueOnce([
        JSON.stringify({
          userId: USER_ID,
          lastSeenAt: '2026-09-09T12:00:00.000Z',
        }),
        null,
        '{not-json',
      ])
      .mockResolvedValueOnce([null]);

    await expect(service.getWorkspaceRoster(WORKSPACE_ID)).resolves.toEqual([
      {
        userId: USER_ID,
        lastSeenAt: '2026-09-09T12:00:00.000Z',
        isTyping: false,
      },
    ]);
  });
});
