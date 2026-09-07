import { Test } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import IORedis from 'ioredis';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const USER_ID_MEMBER = '20202020-3957-4908-9c36-2929a23f8357';

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

const openSocket = (url: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const webSocket = new WebSocket(url);

    webSocket.on('open', () => resolve(webSocket));
    webSocket.on('error', reject);
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

  const signToken = (payload: Record<string, unknown>): string =>
    jwt.sign(payload, appSecret, { algorithm: 'HS256' });

  const adminToken = () =>
    signToken({
      sub: USER_ID,
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: '20202020-1e7c-43d9-a5db-685b506d816',
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: 'password',
    });

  const memberToken = () =>
    signToken({
      sub: USER_ID_MEMBER,
      userId: USER_ID_MEMBER,
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: '20202020-3957-4908-9c36-2929a23f8353',
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: 'password',
    });

  beforeAll(async () => {
    appSecret = process.env.APP_SECRET ?? 'test-secret-for-realtime-spec';

    httpServer = createServer();

    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: RedisClientService,
          useValue: {
            getClient: () => new IORedis(redisUrl, { lazyConnect: false }),
          },
        },
        RealtimeGatewayService,
        RealtimePublisherService,
        RealtimeTopicAuthorizationService,
        {
          provide: JwtWrapperService,
          useValue: {
            verifyJwtToken: (token: string) =>
              Promise.resolve(
                jwt.verify(token, appSecret, { algorithms: ['HS256'] }),
              ),
          },
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
    nestApp = app;

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    baseUrl = `ws://localhost:${(httpServer.address() as AddressInfo).port}/realtime`;
  });

  afterAll(async () => {
    await nestApp.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  const subscribe = (webSocket: WebSocket, topic: string, token: string) => {
    webSocket.send(JSON.stringify({ action: 'subscribe', topic, token }));
  };

  it('completes subscribe → publish fan-out → increasing seq', async () => {
    const firstSocket = await openSocket(baseUrl);
    const topic = `workspace:${WORKSPACE_ID}:presence`;

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

    firstSocket.close();
    secondSocket.close();
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

    webSocket.close();
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

    webSocket.close();
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

    webSocket.close();
  });
});
