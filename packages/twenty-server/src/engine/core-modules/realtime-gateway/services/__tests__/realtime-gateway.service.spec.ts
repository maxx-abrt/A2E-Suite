import type { HttpAdapterHost } from '@nestjs/core';
import { EventEmitter } from 'node:events';

import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import {
  type RealtimeHeartbeatClient,
  RealtimeGatewayService,
  type RealtimeSocketState,
} from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const WORKSPACE_MEMBER_ID = '40404040-1c25-4d02-bf25-6aeccf7ea419';

const createService = (httpAdapter: unknown) =>
  new RealtimeGatewayService(
    { httpAdapter } as HttpAdapterHost,
    {} as RealtimeTopicAuthorizationService,
    {} as RealtimePublisherService,
    {} as PresenceService,
    {} as UserSessionCookieService,
    {} as TwentyConfigService,
    { incrementCounterBy: jest.fn() } as never,
  );

const buildHeartbeatSocket = () => ({
  readyState: 1,
  ping: jest.fn(),
  terminate: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
});

const buildSocketState = (
  overrides: Partial<RealtimeSocketState> = {},
): RealtimeSocketState => ({
  authContext: {
    userId: USER_ID,
    workspaceId: WORKSPACE_ID,
    workspaceMemberId: WORKSPACE_MEMBER_ID,
    isWorkspaceAgnostic: false,
  },
  connectionId: 'connection-1',
  subscriptionsByTopic: new Map(),
  seqByTopic: new Map(),
  isAlive: true,
  ...overrides,
});

const createHeartbeatService = (
  assertStillAMember = jest.fn().mockResolvedValue(undefined),
) => {
  const presenceService = { leave: jest.fn().mockResolvedValue(undefined) };
  const metricsService = { incrementCounterBy: jest.fn() };
  const service = new RealtimeGatewayService(
    { httpAdapter: null } as unknown as HttpAdapterHost,
    { assertStillAMember } as unknown as RealtimeTopicAuthorizationService,
    {} as RealtimePublisherService,
    presenceService as unknown as PresenceService,
    {} as UserSessionCookieService,
    {} as TwentyConfigService,
    metricsService as never,
  );

  return { service, assertStillAMember, presenceService, metricsService };
};

describe('RealtimeGatewayService', () => {
  describe('onModuleInit', () => {
    it('does not throw when no HTTP adapter exists (CLI / worker contexts)', () => {
      const service = createService(null);

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('does not throw when the adapter has no HTTP server yet', () => {
      const service = createService({ getHttpServer: () => null });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('runHeartbeatCycle', () => {
    it('pings a live socket and keeps it while membership is active', async () => {
      const { service, assertStillAMember } = createHeartbeatService();
      const webSocket = buildHeartbeatSocket();
      const socketState = buildSocketState();

      await service.runHeartbeatCycle([
        { webSocket, socketState } as unknown as RealtimeHeartbeatClient,
      ]);

      expect(webSocket.ping).toHaveBeenCalledTimes(1);
      expect(webSocket.terminate).not.toHaveBeenCalled();
      expect(assertStillAMember).toHaveBeenCalledWith(socketState.authContext);
      expect(socketState.isAlive).toBe(false);
    });

    it('terminates a socket that missed the previous pong without revalidating', async () => {
      const { service, assertStillAMember } = createHeartbeatService();
      const webSocket = buildHeartbeatSocket();
      const socketState = buildSocketState({ isAlive: false });

      await service.runHeartbeatCycle([
        { webSocket, socketState } as unknown as RealtimeHeartbeatClient,
      ]);

      expect(webSocket.terminate).toHaveBeenCalledTimes(1);
      expect(assertStillAMember).not.toHaveBeenCalled();
    });

    it('revokes every subscription when the member was removed', async () => {
      const { service, presenceService } = createHeartbeatService(
        jest
          .fn()
          .mockRejectedValue(
            new Error('User is not a member of the workspace'),
          ),
      );
      const webSocket = buildHeartbeatSocket();
      const presenceUnsubscribe = jest.fn();
      const recordUnsubscribe = jest.fn();
      const socketState = buildSocketState({
        subscriptionsByTopic: new Map([
          [`workspace:${WORKSPACE_ID}:presence`, presenceUnsubscribe],
          [`workspace:${WORKSPACE_ID}`, recordUnsubscribe],
        ]),
        seqByTopic: new Map([[`workspace:${WORKSPACE_ID}`, 7]]),
      });

      await service.runHeartbeatCycle([
        { webSocket, socketState } as unknown as RealtimeHeartbeatClient,
      ]);

      expect(presenceUnsubscribe).toHaveBeenCalledTimes(1);
      expect(recordUnsubscribe).toHaveBeenCalledTimes(1);
      expect(socketState.subscriptionsByTopic.size).toBe(0);
      expect(socketState.seqByTopic.size).toBe(0);
      expect(socketState.authContext).toBeNull();
      expect(presenceService.leave).toHaveBeenCalledTimes(1);

      const errorEnvelope = JSON.parse(webSocket.send.mock.calls[0][0]);

      expect(errorEnvelope.type).toBe('error');
      expect(errorEnvelope.payload.message).toBe(
        'User is not a member of the workspace',
      );
      expect(webSocket.close).toHaveBeenCalledWith(
        4403,
        'User is not a member of the workspace',
      );
    });

    it('pings unauthenticated sockets without revalidating membership', async () => {
      const { service, assertStillAMember } = createHeartbeatService();
      const webSocket = buildHeartbeatSocket();
      const socketState = buildSocketState({ authContext: null });

      await service.runHeartbeatCycle([
        { webSocket, socketState } as unknown as RealtimeHeartbeatClient,
      ]);

      expect(webSocket.ping).toHaveBeenCalledTimes(1);
      expect(assertStillAMember).not.toHaveBeenCalled();
    });
  });

  describe('socket lifecycle metrics', () => {
    const buildConnectionSocket = () => new EventEmitter();

    it('increments the connected counter when a socket connects then the disconnected counter when it closes', () => {
      const metricsService = { incrementCounterBy: jest.fn() };
      const service = new RealtimeGatewayService(
        { httpAdapter: null } as unknown as HttpAdapterHost,
        {} as RealtimeTopicAuthorizationService,
        {} as RealtimePublisherService,
        {} as PresenceService,
        {} as UserSessionCookieService,
        {} as TwentyConfigService,
        metricsService as never,
      );
      const webSocket = buildConnectionSocket();

      service.handleConnection(webSocket as never, {} as never);

      expect(metricsService.incrementCounterBy).toHaveBeenCalledWith({
        key: MetricsKeys.RealtimeSocketConnected,
        amount: 1,
      });

      webSocket.emit('close');

      expect(metricsService.incrementCounterBy).toHaveBeenCalledWith({
        key: MetricsKeys.RealtimeSocketDisconnected,
        amount: 1,
      });
    });

    it('counts a disconnect only once even if close fires twice', () => {
      const metricsService = { incrementCounterBy: jest.fn() };
      const service = new RealtimeGatewayService(
        { httpAdapter: null } as unknown as HttpAdapterHost,
        {} as RealtimeTopicAuthorizationService,
        {} as RealtimePublisherService,
        {} as PresenceService,
        {} as UserSessionCookieService,
        {} as TwentyConfigService,
        metricsService as never,
      );
      const webSocket = buildConnectionSocket();

      service.handleConnection(webSocket as never, {} as never);

      webSocket.emit('close');
      webSocket.emit('close');

      expect(metricsService.incrementCounterBy).toHaveBeenCalledTimes(2);
      expect(metricsService.incrementCounterBy).toHaveBeenCalledWith({
        key: MetricsKeys.RealtimeSocketConnected,
        amount: 1,
      });
      expect(metricsService.incrementCounterBy).toHaveBeenCalledWith({
        key: MetricsKeys.RealtimeSocketDisconnected,
        amount: 1,
      });
    });
  });
});
