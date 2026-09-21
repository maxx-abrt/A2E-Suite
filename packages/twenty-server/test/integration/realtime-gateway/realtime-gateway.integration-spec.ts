import { Test } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import {
  REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE,
  REALTIME_RECORD_ACCESS_DENIED_MESSAGE,
  RealtimeTopicAccessService,
} from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import IORedis from 'ioredis';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const USER_ID_MEMBER = '20202020-3957-4908-9c36-2929a23f8357';
const WORKSPACE_MEMBER_ID = '20202020-1e7c-43d9-a5db-685b506d816';
const WORKSPACE_MEMBER_ID_MEMBER = '20202020-3957-4908-9c36-2929a23f8353';

// The authorization service resolves membership from the workspace member
// cache on every subscribe, so the isolated app needs that map without a DB.
const WORKSPACE_MEMBER_ID_BY_USER_ID: Record<string, string> = {
  [USER_ID]: WORKSPACE_MEMBER_ID,
  [USER_ID_MEMBER]: WORKSPACE_MEMBER_ID_MEMBER,
};

const waitForMessage = (
  webSocket: WebSocket,
  predicate: (envelope: Record<string, unknown>) => boolean,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      webSocket.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for message'));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.MessageEvent) => {
      const envelope = JSON.parse(raw.data.toString()) as Record<
        string,
        unknown
      >;

      if (predicate(envelope)) {
        clearTimeout(timeout);
        webSocket.removeEventListener('message', onMessage);
        resolve(envelope);
      }
    };

    webSocket.addEventListener('message', onMessage);
  });

// Browsers always send Origin on a WebSocket handshake and the gateway
// rejects origin-less upgrades (audit F02), so the client mirrors the
// same-origin URL the upgrade handler compares against.
const originForWebSocketUrl = (url: string): string => {
  const parsedUrl = new URL(url);
  const originProtocol = parsedUrl.protocol === 'wss:' ? 'https:' : 'http:';

  return `${originProtocol}//${parsedUrl.host}`;
};

// Every socket the suite opens, so afterAll can close stragglers before
// httpServer.close — its callback never fires while a socket is still open.
const openSockets = new Set<WebSocket>();

const openSocket = (url: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const webSocket = new WebSocket(url, {
      origin: originForWebSocketUrl(url),
    });

    openSockets.add(webSocket);
    webSocket.once('close', () => openSockets.delete(webSocket));
    webSocket.on('open', () => resolve(webSocket));
    webSocket.on('error', reject);
  });

const closeSocket = (webSocket: WebSocket) =>
  new Promise<void>((resolve) => {
    if (webSocket.readyState === WebSocket.CLOSED) {
      resolve();

      return;
    }

    webSocket.once('close', () => resolve());
    webSocket.close();
  });

// Boots the gateway in isolation on an ephemeral port with real Redis
// pub/sub fan-out. Tokens are signed here with HS256 (the gateway's verify
// path is exercised through a thin JwtWrapperService stand-in — full JWT
// verification has its own unit suite; the shared full-app integration
// harness is broken on this branch, see phase report).
describe('Realtime Gateway (isolated app)', () => {
  let appSecret: string;
  let nestApp: { close: () => Promise<void> };
  let httpServer: Server;
  let baseUrl: string;
  let publisherService: RealtimePublisherService;
  let presenceService: PresenceService;
  let redisClient: IORedis;

  const signToken = (payload: Record<string, unknown>): string =>
    jwt.sign(payload, appSecret, { algorithm: 'HS256' });

  const adminToken = () =>
    signToken({
      sub: USER_ID,
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      userWorkspaceId: '20202020-1e7c-43d9-a5db-685b506d816',
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: 'password',
    });

  const memberToken = () =>
    signToken({
      sub: USER_ID_MEMBER,
      userId: USER_ID_MEMBER,
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID_MEMBER,
      userWorkspaceId: '20202020-3957-4908-9c36-2929a23f8353',
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: 'password',
    });

  beforeAll(async () => {
    appSecret = process.env.APP_SECRET ?? 'test-secret-for-realtime-spec';

    httpServer = createServer();

    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    redisClient = new IORedis(redisUrl, { lazyConnect: false });

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: RedisClientService,
          useValue: {
            getClient: () => redisClient,
          },
        },
        PresenceService,
        RealtimeGatewayService,
        RealtimePublisherService,
        RealtimeTopicAuthorizationService,
        {
          provide: MetricsService,
          useValue: { incrementCounterBy: () => {} },
        },
        {
          provide: JwtWrapperService,
          useValue: {
            verifyJwtToken: (token: string) =>
              Promise.resolve(
                jwt.verify(token, appSecret, { algorithms: ['HS256'] }),
              ),
          },
        },
        // Membership is resolved from the workspace member cache on every
        // subscribe; this map mirrors the ids embedded in the test tokens so
        // the real authorization service runs without a database.
        {
          provide: WorkspaceCacheService,
          useValue: {
            getOrRecompute: () =>
              Promise.resolve({
                flatWorkspaceMemberMaps: {
                  idByUserId: WORKSPACE_MEMBER_ID_BY_USER_ID,
                },
              }),
          },
        },
        // Session-cookie tokens and record/channel ACLs are not exercised by
        // this suite (they need the HTTP session / permissioned repository);
        // the gateway only reaches them through the paths under test here.
        {
          provide: UserSessionService,
          useValue: {},
        },
        {
          provide: UserSessionCookieService,
          useValue: {},
        },
        // The real service reads record/channel ACLs through a permissioned
        // repository (DB). The isolated harness has no DB, so it denies every
        // record/channel topic with the canonical denial messages: that keeps
        // the gateway's subscription-failure acknowledgement path under test
        // while the ACL decision itself stays unit-tested and the revocation
        // journey stays a Tier-2 orchestrator residual.
        {
          provide: RealtimeTopicAccessService,
          useValue: {
            assertCanAccessObjectRecord: () =>
              Promise.reject(new Error(REALTIME_RECORD_ACCESS_DENIED_MESSAGE)),
            assertCanAccessChatChannel: () =>
              Promise.reject(new Error(REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE)),
          },
        },
        {
          provide: TwentyConfigService,
          useValue: { get: () => undefined },
        },
        {
          provide: HttpAdapterHost,
          useValue: {
            httpAdapter: {
              getHttpServer: () => httpServer,
            },
          },
        },
      ],
    }).compile();

    const app = await moduleRef.createNestApplication();

    await app.init();

    publisherService = app.get(RealtimePublisherService);
    presenceService = app.get(PresenceService);
    nestApp = app;

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    baseUrl = `ws://localhost:${(httpServer.address() as AddressInfo).port}/realtime`;
  });

  afterAll(async () => {
    // Close every socket the suite opened before closing the server: a socket
    // left open by a failing/timed-out test keeps httpServer.close's callback
    // from ever firing, which is what left the jest process alive forever.
    await Promise.all(
      [...openSockets].map((webSocket) => closeSocket(webSocket)),
    );
    openSockets.clear();

    // nestApp.close() runs onModuleDestroy: the gateway clears its heartbeat
    // interval and WebSocketServer, and the publisher quits the duplicate
    // Redis subscriber connection it opened for pub/sub.
    await nestApp.close();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    // The test-owned publisher client (RedisClientService.getClient()) is not
    // released by the app's destroy hook.
    await redisClient.quit();
  });

  const subscribe = (webSocket: WebSocket, topic: string, token: string) => {
    webSocket.send(JSON.stringify({ action: 'subscribe', topic, token }));
  };

  it('completes subscribe → publish fan-out → increasing seq', async () => {
    const firstSocket = await openSocket(baseUrl);
    const topic = `workspace:${WORKSPACE_ID}`;

    subscribe(firstSocket, topic, adminToken());

    await waitForMessage(firstSocket, (envelope) => envelope.type === 'ack');

    const secondSocket = await openSocket(baseUrl);

    subscribe(secondSocket, topic, memberToken());

    await waitForMessage(secondSocket, (envelope) => envelope.type === 'ack');

    await publisherService.publish(topic, { hello: 'world' });

    const [firstEnvelope, secondEnvelope] = await Promise.all([
      waitForMessage(firstSocket, (envelope) => envelope.type === 'event'),
      waitForMessage(secondSocket, (envelope) => envelope.type === 'event'),
    ]);

    expect(firstEnvelope.topic).toBe(topic);
    expect(firstEnvelope.payload).toEqual({ hello: 'world' });
    expect(secondEnvelope.payload).toEqual({ hello: 'world' });
    expect(secondEnvelope.seq).toBeGreaterThan(0);

    await publisherService.publish(topic, { hello: 'again' });

    const followUp = await waitForMessage(
      firstSocket,
      (envelope) => envelope.type === 'event',
    );

    expect(followUp.seq as number).toBeGreaterThan(firstEnvelope.seq as number);

    await Promise.all([closeSocket(firstSocket), closeSocket(secondSocket)]);
  });

  it('tracks TTL presence and broadcasts join, typing, and leave', async () => {
    const existingPresenceKeys = await redisClient.keys(
      `presence*:${WORKSPACE_ID}:*`,
    );

    if (existingPresenceKeys.length > 0) {
      await redisClient.del(...existingPresenceKeys);
    }

    const topic = `workspace:${WORKSPACE_ID}:presence`;
    const observerSocket = await openSocket(baseUrl);

    subscribe(observerSocket, topic, adminToken());
    await waitForMessage(observerSocket, (envelope) => envelope.type === 'ack');

    const actorSocket = await openSocket(baseUrl);
    const joinEventPromise = waitForMessage(observerSocket, (envelope) => {
      const payload = envelope.payload as {
        event?: string;
        member?: { userId?: string };
      };

      return (
        payload.event === 'join' && payload.member?.userId === USER_ID_MEMBER
      );
    });

    subscribe(actorSocket, topic, memberToken());
    await waitForMessage(actorSocket, (envelope) => envelope.type === 'ack');
    await expect(joinEventPromise).resolves.toMatchObject({ topic });

    await expect(
      presenceService.getWorkspaceRoster(WORKSPACE_ID),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: USER_ID, isTyping: false }),
        expect.objectContaining({ userId: USER_ID_MEMBER, isTyping: false }),
      ]),
    );

    const typingEventPromise = waitForMessage(observerSocket, (envelope) => {
      const payload = envelope.payload as {
        event?: string;
        member?: { userId?: string };
      };

      return (
        payload.event === 'typing' && payload.member?.userId === USER_ID_MEMBER
      );
    });

    actorSocket.send(
      JSON.stringify({
        action: 'presence',
        topic,
        event: 'typing-started',
        typingContext: 'record:company:1',
      }),
    );

    await expect(typingEventPromise).resolves.toMatchObject({
      payload: {
        event: 'typing',
        isTyping: true,
        typingContext: 'record:company:1',
      },
    });

    const leaveEventPromise = waitForMessage(observerSocket, (envelope) => {
      const payload = envelope.payload as {
        event?: string;
        member?: { userId?: string };
      };

      return (
        payload.event === 'leave' && payload.member?.userId === USER_ID_MEMBER
      );
    });

    await closeSocket(actorSocket);
    await expect(leaveEventPromise).resolves.toMatchObject({ topic });

    await expect(
      presenceService.getWorkspaceRoster(WORKSPACE_ID),
    ).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: USER_ID_MEMBER }),
      ]),
    );

    await closeSocket(observerSocket);
  });

  it('rejects presence publishing before subscription and on non-presence topics', async () => {
    const webSocket = await openSocket(baseUrl);
    const presenceTopic = `workspace:${WORKSPACE_ID}:presence`;

    webSocket.send(
      JSON.stringify({
        action: 'presence',
        topic: presenceTopic,
        event: 'heartbeat',
      }),
    );

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
    ).resolves.toMatchObject({
      payload: {
        message: 'Subscribe to presence before publishing presence state',
      },
    });

    const workspaceTopic = `workspace:${WORKSPACE_ID}`;

    subscribe(webSocket, workspaceTopic, adminToken());
    await waitForMessage(webSocket, (envelope) => envelope.type === 'ack');
    webSocket.send(
      JSON.stringify({
        action: 'presence',
        topic: workspaceTopic,
        event: 'typing-started',
      }),
    );

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
    ).resolves.toMatchObject({
      payload: { message: 'Presence updates require a presence topic' },
    });

    await closeSocket(webSocket);
  });

  it('rejects an invalid token but keeps the socket usable', async () => {
    const webSocket = await openSocket(baseUrl);

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, 'invalid-token');

    const errorEnvelope = await waitForMessage(
      webSocket,
      (envelope) => envelope.type === 'error',
    );

    expect(errorEnvelope.type).toBe('error');

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, adminToken());

    const ack = await waitForMessage(
      webSocket,
      (envelope) => envelope.type === 'ack',
    );

    expect(ack.payload).toEqual({ action: 'subscribed' });

    await closeSocket(webSocket);
  });

  it('isolates topics across workspaces', async () => {
    const webSocket = await openSocket(baseUrl);

    subscribe(
      webSocket,
      'workspace:99999999-1c25-4d02-bf25-6aeccf7ea419',
      adminToken(),
    );

    const errorEnvelope = await waitForMessage(
      webSocket,
      (envelope) => envelope.type === 'error',
    );

    expect(errorEnvelope.payload).toMatchObject({
      message: 'Topic workspace does not match the authenticated one',
    });

    await closeSocket(webSocket);
  });

  it('scopes inbox topics to the owning user', async () => {
    const webSocket = await openSocket(baseUrl);

    subscribe(
      webSocket,
      `workspace:${WORKSPACE_ID}:inbox:not-me`,
      memberToken(),
    );

    const errorEnvelope = await waitForMessage(
      webSocket,
      (envelope) => envelope.type === 'error',
    );

    expect(errorEnvelope.payload).toMatchObject({
      message: 'Inbox topics are scoped to the owning user',
    });

    await closeSocket(webSocket);
  });

  it('rejects malformed and unknown topic shapes but keeps the socket usable', async () => {
    const webSocket = await openSocket(baseUrl);

    const malformedTopics = [
      'not-a-topic',
      `workspace:${WORKSPACE_ID}:not-a-kind`,
      'workspace:not-a-uuid',
    ];

    for (const topic of malformedTopics) {
      subscribe(webSocket, topic, adminToken());

      // The error echoes the offending topic so a client can attribute the
      // failure to the subscribe that caused it.
      await expect(
        waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
      ).resolves.toMatchObject({
        topic,
        seq: 0,
        type: 'error',
        payload: { message: `Invalid realtime topic: ${topic}` },
      });
    }

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, adminToken());

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'ack'),
    ).resolves.toMatchObject({ payload: { action: 'subscribed' } });

    await closeSocket(webSocket);
  });

  it('rejects a token whose user is not a workspace member but keeps the socket usable', async () => {
    const webSocket = await openSocket(baseUrl);

    const nonMemberToken = signToken({
      sub: '20202020-1111-4111-8111-111111111111',
      userId: '20202020-1111-4111-8111-111111111111',
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: '20202020-2222-4222-8222-222222222222',
      userWorkspaceId: '20202020-3333-4333-8333-333333333333',
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: 'password',
    });

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, nonMemberToken);

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
    ).resolves.toMatchObject({
      payload: { message: 'User is not a member of the workspace' },
    });

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, adminToken());

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'ack'),
    ).resolves.toMatchObject({ payload: { action: 'subscribed' } });

    await closeSocket(webSocket);
  });

  it('rejects record and channel topics the caller cannot access but keeps the socket usable', async () => {
    const webSocket = await openSocket(baseUrl);

    const channelTopic = `workspace:${WORKSPACE_ID}:chat:20202020-4444-4444-8444-444444444444`;

    subscribe(webSocket, channelTopic, adminToken());

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
    ).resolves.toMatchObject({
      topic: channelTopic,
      payload: { message: REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE },
    });

    const recordTopic = `workspace:${WORKSPACE_ID}:object:company:20202020-5555-4555-8555-555555555555`;

    subscribe(webSocket, recordTopic, adminToken());

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'error'),
    ).resolves.toMatchObject({
      topic: recordTopic,
      payload: { message: REALTIME_RECORD_ACCESS_DENIED_MESSAGE },
    });

    subscribe(webSocket, `workspace:${WORKSPACE_ID}`, adminToken());

    await expect(
      waitForMessage(webSocket, (envelope) => envelope.type === 'ack'),
    ).resolves.toMatchObject({ payload: { action: 'subscribed' } });

    await closeSocket(webSocket);
  });

  it('starts a reconnected socket at a fresh sequence without replaying the backlog', async () => {
    const topic = `workspace:${WORKSPACE_ID}`;

    // A stable subscriber keeps the topic's Redis subscription alive while the
    // first socket drops, so the case measures the reconnect contract rather
    // than the publisher's asynchronous Redis unsubscribe timing.
    const keeperSocket = await openSocket(baseUrl);

    subscribe(keeperSocket, topic, adminToken());
    await waitForMessage(keeperSocket, (envelope) => envelope.type === 'ack');

    const firstSocket = await openSocket(baseUrl);

    subscribe(firstSocket, topic, memberToken());
    await waitForMessage(firstSocket, (envelope) => envelope.type === 'ack');

    const firstEventPromise = waitForMessage(
      firstSocket,
      (envelope) => envelope.type === 'event',
    );

    await publisherService.publish(topic, { step: 'before-reconnect' });

    const firstEvent = await firstEventPromise;

    expect(firstEvent.seq).toBe(1);

    const firstFollowUpPromise = waitForMessage(
      firstSocket,
      (envelope) => envelope.type === 'event',
    );

    await publisherService.publish(topic, { step: 'before-reconnect-2' });

    await expect(firstFollowUpPromise).resolves.toMatchObject({ seq: 2 });

    await closeSocket(firstSocket);

    // Published after the first socket closed: Redis pub/sub retains nothing,
    // so a reconnecting socket must not receive this as a replayed backlog.
    const keeperOfflinePromise = waitForMessage(
      keeperSocket,
      (envelope) =>
        envelope.type === 'event' &&
        (envelope.payload as { step?: string }).step === 'while-offline',
    );

    await publisherService.publish(topic, { step: 'while-offline' });

    await keeperOfflinePromise;

    const secondSocket = await openSocket(baseUrl);

    subscribe(secondSocket, topic, adminToken());

    const reconnectAck = await waitForMessage(
      secondSocket,
      (envelope) => envelope.type === 'ack',
    );

    expect(reconnectAck.seq).toBe(0);

    const reconnectedEventPromise = waitForMessage(
      secondSocket,
      (envelope) => envelope.type === 'event',
    );

    await publisherService.publish(topic, { step: 'after-reconnect' });

    const reconnectedEvent = await reconnectedEventPromise;

    // A fresh per-socket cursor: seq 1 again (not the keeper's next value) and
    // the current live publish, not one of the earlier events.
    expect(reconnectedEvent.seq).toBe(1);
    expect(reconnectedEvent.payload).toEqual({ step: 'after-reconnect' });

    const reconnectedFollowUpPromise = waitForMessage(
      secondSocket,
      (envelope) =>
        envelope.type === 'event' &&
        (envelope.payload as { step?: string }).step === 'after-reconnect-2',
    );

    await publisherService.publish(topic, { step: 'after-reconnect-2' });

    await expect(reconnectedFollowUpPromise).resolves.toMatchObject({ seq: 2 });

    await Promise.all([closeSocket(secondSocket), closeSocket(keeperSocket)]);
  });
});
