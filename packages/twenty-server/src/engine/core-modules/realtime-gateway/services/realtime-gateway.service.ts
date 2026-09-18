import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { isDefined } from 'twenty-shared/utils';

import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';

import {
  REALTIME_HEARTBEAT_INTERVAL_MS,
  REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET,
  REALTIME_WS_PATH,
} from 'src/engine/core-modules/realtime-gateway/realtime-gateway.constants';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { type RealtimeAuthenticatedSocketContext } from 'src/engine/core-modules/realtime-gateway/types/realtime-topic-context.type';
import {
  isRealtimeClientMessage,
  type RealtimeEnvelope,
  type RealtimePresenceMessage,
} from 'src/engine/core-modules/realtime-gateway/types/realtime-envelope.type';
import { parseRealtimeTopic } from 'src/engine/core-modules/realtime-gateway/utils/parse-realtime-topic.util';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';
import { isRequestOriginAllowed } from 'src/engine/core-modules/user-session/utils/is-request-origin-allowed.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type Request } from 'express';

export type RealtimeSocketState = {
  authContext: RealtimeAuthenticatedSocketContext | null;
  connectionId: string;
  subscriptionsByTopic: Map<string, () => void>;
  seqByTopic: Map<string, number>;
  isAlive: boolean;
};

// The heartbeat only needs the ws surface it touches, so unit tests can drive
// it with a fake socket instead of fabricating a real upgrade handshake.
export type RealtimeHeartbeatSocket = Pick<
  WebSocket,
  'ping' | 'terminate' | 'close' | 'send' | 'readyState'
>;

export type RealtimeHeartbeatClient = {
  webSocket: RealtimeHeartbeatSocket;
  socketState: RealtimeSocketState;
};

const EMPTY_SOCKET_CONTEXT: RealtimeAuthenticatedSocketContext | null = null;

// Raw ws server mounted on the Nest HTTP server (same port) at /realtime.
// The upgrade enforces the same origin policy as credentialed HTTP requests
// (audit F02): cross-origin handshakes cannot carry cookies, so they would
// never authenticate anyway — rejecting them early keeps that invariant
// server-side instead of relying on client behavior. Authentication happens
// per subscribe through the shared HTTP session/JWT resolution, and the
// result is never cached across subscribes, so a revoked session or removed
// membership stops new subscriptions immediately.
@Injectable()
export class RealtimeGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGatewayService.name);
  private webSocketServer: WebSocketServer | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly socketStates = new WeakMap<WebSocket, RealtimeSocketState>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly topicAuthorizationService: RealtimeTopicAuthorizationService,
    private readonly publisherService: RealtimePublisherService,
    private readonly presenceService: PresenceService,
    private readonly userSessionCookieService: UserSessionCookieService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit(): void {
    // CLI commands and the queue worker boot via createApplicationContext,
    // where httpAdapter itself is null — without this guard every
    // command:prod / worker:prod boot dies here before doing any work.
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    if (!isDefined(httpAdapter)) {
      this.logger.warn('No HTTP adapter available; realtime gateway disabled');

      return;
    }

    const httpServer = httpAdapter.getHttpServer();

    if (!isDefined(httpServer)) {
      this.logger.warn('No HTTP server available; realtime gateway disabled');

      return;
    }

    this.webSocketServer = new WebSocketServer({
      noServer: true,
      path: REALTIME_WS_PATH,
    });

    httpServer.on(
      'upgrade',
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        const { pathname } = new URL(request.url ?? '', 'http://localhost');

        if (pathname !== REALTIME_WS_PATH) {
          return;
        }

        const origin = request.headers.origin;

        // isRequestOriginAllowed expects an express Request for its
        // same-origin comparison; the ws upgrade carries the same Host and
        // x-forwarded-proto headers, so a minimal stand-in preserves the
        // shared policy (including proxy-terminated https) without coupling
        // the util to socket specifics.
        const forwardedProto = request.headers['x-forwarded-proto'];
        const protocol =
          typeof forwardedProto === 'string'
            ? forwardedProto.split(',')[0].trim()
            : 'http';

        const upgradeRequest = {
          protocol,
          get: (name: string) => request.headers[name.toLowerCase()],
        } as unknown as Request;

        if (
          !isDefined(origin) ||
          !isRequestOriginAllowed({
            origin,
            request: upgradeRequest,
            twentyConfigService: this.twentyConfigService,
          })
        ) {
          this.logger.warn(
            `Rejected realtime upgrade from origin ${origin ?? 'missing'}`,
          );

          socket.destroy();

          return;
        }

        this.webSocketServer?.handleUpgrade(
          request,
          socket,
          head,
          (webSocket) => {
            this.handleConnection(webSocket, request);
          },
        );
      },
    );

    this.heartbeatInterval = setInterval(() => {
      const clients = [...this.enumerateClients()].flatMap((webSocket) => {
        const socketState = this.socketStates.get(webSocket);

        return isDefined(socketState) ? [{ webSocket, socketState }] : [];
      });

      void this.runHeartbeatCycle(clients).catch((error: unknown) => {
        this.logger.error(
          `Realtime heartbeat cycle failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }, REALTIME_HEARTBEAT_INTERVAL_MS);

    this.webSocketServer.on('close', () => {
      if (isDefined(this.heartbeatInterval)) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });
  }

  onModuleDestroy(): void {
    if (isDefined(this.heartbeatInterval)) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.webSocketServer?.close();
    this.webSocketServer = null;
  }

  private enumerateClients(): Iterable<WebSocket> {
    return this.webSocketServer?.clients ?? [];
  }

  // Public so unit tests can drive one heartbeat pass with fake sockets; the
  // interval only assembles the client list and delegates here.
  async runHeartbeatCycle(
    clients: ReadonlyArray<RealtimeHeartbeatClient>,
  ): Promise<void> {
    await Promise.all(
      clients.map(async ({ webSocket, socketState }) => {
        if (!socketState.isAlive) {
          webSocket.terminate();

          return;
        }

        socketState.isAlive = false;
        webSocket.ping();

        await this.revalidateSocketAuthorizations(webSocket, socketState);
      }),
    );
  }

  private async revalidateSocketAuthorizations(
    webSocket: RealtimeHeartbeatSocket,
    socketState: RealtimeSocketState,
  ): Promise<void> {
    if (!isDefined(socketState.authContext)) {
      return;
    }

    try {
      await this.topicAuthorizationService.assertStillAMember(
        socketState.authContext,
      );
    } catch (error) {
      await this.revokeSocket(
        webSocket,
        socketState,
        error instanceof Error ? error.message : 'Workspace membership revoked',
      );

      return;
    }

    await this.dropRevokedTopics(webSocket, socketState);
  }

  // A member who is still in the workspace can nevertheless lose a record or
  // channel (role change, removed from a private channel, RLS change). Those
  // are per-topic losses: drop only the revoked topics and attribute the error
  // to each one, keeping the authenticated session — and its still-valid
  // topics — alive.
  private async dropRevokedTopics(
    webSocket: RealtimeHeartbeatSocket,
    socketState: RealtimeSocketState,
  ): Promise<void> {
    const authContext = socketState.authContext;

    if (!isDefined(authContext)) {
      return;
    }

    for (const topic of [...socketState.subscriptionsByTopic.keys()]) {
      try {
        await this.topicAuthorizationService.assertTopicAuthorized(
          authContext,
          topic,
        );
      } catch (error) {
        const unsubscribe = socketState.subscriptionsByTopic.get(topic);

        unsubscribe?.();
        socketState.subscriptionsByTopic.delete(topic);
        socketState.seqByTopic.delete(topic);

        if (this.isPresenceTopic(topic)) {
          try {
            await this.presenceService.leave(
              this.toPresenceIdentity(socketState),
            );
          } catch (presenceError) {
            this.logger.warn(
              `Failed to clear presence for a revoked topic: ${
                presenceError instanceof Error
                  ? presenceError.message
                  : 'unknown error'
              }`,
            );
          }
        }

        this.sendError(
          webSocket,
          error instanceof Error ? error.message : 'Topic access revoked',
          topic,
        );
      }
    }
  }

  private async revokeSocket(
    webSocket: RealtimeHeartbeatSocket,
    socketState: RealtimeSocketState,
    message: string,
  ): Promise<void> {
    if (
      [...socketState.subscriptionsByTopic.keys()].some((topic) =>
        this.isPresenceTopic(topic),
      )
    ) {
      // Presence cleanup is best-effort; the revocation below must proceed
      // even when the presence backend is unreachable.
      try {
        await this.presenceService.leave(this.toPresenceIdentity(socketState));
      } catch (error) {
        this.logger.warn(
          `Failed to clear presence while revoking a socket: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    for (const unsubscribe of socketState.subscriptionsByTopic.values()) {
      unsubscribe();
    }

    socketState.subscriptionsByTopic.clear();
    socketState.seqByTopic.clear();
    socketState.authContext = null;

    // 4403 (policy violation) tells the client this was an authorization
    // close, not a transport failure; a still-valid session reconnects and
    // re-authenticates harmlessly.
    this.sendError(webSocket, message);
    webSocket.close(4403, message);
  }

  // Public so unit tests can exercise the connect/disconnect metric emission
  // with a fake socket, matching the runHeartbeatCycle testing seam.
  handleConnection(webSocket: WebSocket, request: IncomingMessage): void {
    this.socketStates.set(webSocket, {
      authContext: EMPTY_SOCKET_CONTEXT,
      connectionId: randomUUID(),
      subscriptionsByTopic: new Map(),
      seqByTopic: new Map(),
      isAlive: true,
    });

    this.metricsService.incrementCounterBy({
      key: MetricsKeys.RealtimeSocketConnected,
      amount: 1,
    });

    webSocket.on('pong', () => {
      const socketState = this.socketStates.get(webSocket);

      if (isDefined(socketState)) {
        socketState.isAlive = true;
        void this.refreshPresence(socketState);
      }
    });

    webSocket.on('message', (raw) => {
      void this.handleClientMessage(webSocket, request, raw.toString());
    });

    webSocket.on('close', () => {
      const socketState = this.socketStates.get(webSocket);

      if (isDefined(socketState)) {
        void this.leavePresence(socketState);

        for (const unsubscribe of socketState.subscriptionsByTopic.values()) {
          unsubscribe();
        }

        this.socketStates.delete(webSocket);

        this.metricsService.incrementCounterBy({
          key: MetricsKeys.RealtimeSocketDisconnected,
          amount: 1,
        });
      }
    });

    webSocket.on('error', () => {
      webSocket.terminate();
    });
  }

  private async handleClientMessage(
    webSocket: WebSocket,
    request: IncomingMessage,
    raw: string,
  ): Promise<void> {
    const socketState = this.socketStates.get(webSocket);

    if (!isDefined(socketState)) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendError(webSocket, 'Malformed message');

      return;
    }

    if (!isRealtimeClientMessage(parsed)) {
      this.sendError(webSocket, 'Unsupported message');

      return;
    }

    if (parsed.action === 'presence') {
      try {
        await this.handlePresenceMessage(webSocket, socketState, parsed);
      } catch (error) {
        this.sendError(
          webSocket,
          error instanceof Error ? error.message : 'Presence update rejected',
        );
      }

      return;
    }

    if (parsed.action === 'unsubscribe') {
      const unsubscribe = socketState.subscriptionsByTopic.get(parsed.topic);

      if (isDefined(unsubscribe)) {
        if (
          isDefined(socketState.authContext) &&
          this.isPresenceTopic(parsed.topic)
        ) {
          await this.presenceService.leave(
            this.toPresenceIdentity(socketState),
          );
        }

        unsubscribe();
        socketState.subscriptionsByTopic.delete(parsed.topic);
        socketState.seqByTopic.delete(parsed.topic);
      }

      this.sendEnvelope(webSocket, {
        topic: parsed.topic,
        seq: 0,
        type: 'ack',
        payload: { action: 'unsubscribed' },
      });

      return;
    }

    try {
      // Re-authenticated on every subscribe — never cached — so session
      // revocation and membership removal take effect on the next message.
      const authContext = await this.topicAuthorizationService.authenticate(
        parsed.token ??
          this.userSessionCookieService.extractSessionTokenFromRequest({
            headers: { cookie: request.headers.cookie },
          } as never),
      );

      await this.topicAuthorizationService.assertTopicAuthorized(
        authContext,
        parsed.topic,
      );

      socketState.authContext = authContext;

      if (
        socketState.subscriptionsByTopic.size >=
        REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET
      ) {
        throw new Error('Subscription limit reached');
      }

      if (!socketState.subscriptionsByTopic.has(parsed.topic)) {
        const redisSeqByTopic = socketState.seqByTopic;

        void this.publisherService
          .subscribeTopic(parsed.topic, ({ payload }) => {
            const socketStateInner = this.socketStates.get(webSocket);

            if (!isDefined(socketStateInner)) {
              return;
            }

            const previousSeq = redisSeqByTopic.get(parsed.topic) ?? 0;
            const nextSeq = previousSeq + 1;

            redisSeqByTopic.set(parsed.topic, nextSeq);

            this.sendEnvelope(webSocket, {
              topic: parsed.topic,
              seq: nextSeq,
              type: 'event',
              payload,
            });
          })
          .then(async (unsubscribe) => {
            const currentState = this.socketStates.get(webSocket);

            if (!isDefined(currentState)) {
              unsubscribe();

              return;
            }

            currentState.subscriptionsByTopic.set(parsed.topic, unsubscribe);

            this.sendEnvelope(webSocket, {
              topic: parsed.topic,
              seq: 0,
              type: 'ack',
              payload: { action: 'subscribed' },
            });

            if (this.isPresenceTopic(parsed.topic)) {
              await this.presenceService.join(
                this.toPresenceIdentity(currentState),
              );
            }
          })
          .catch((error: unknown) => {
            this.sendError(
              webSocket,
              error instanceof Error ? error.message : 'Subscription rejected',
              parsed.topic,
            );
          });
      } else {
        this.sendEnvelope(webSocket, {
          topic: parsed.topic,
          seq: 0,
          type: 'ack',
          payload: { action: 'subscribed' },
        });
      }
    } catch (error) {
      this.sendError(
        webSocket,
        error instanceof Error ? error.message : 'Subscription rejected',
        parsed.topic,
      );
    }
  }

  private async handlePresenceMessage(
    webSocket: WebSocket,
    socketState: RealtimeSocketState,
    message: RealtimePresenceMessage,
  ): Promise<void> {
    if (!isDefined(socketState.authContext)) {
      throw new Error('Subscribe to presence before publishing presence state');
    }

    if (!socketState.subscriptionsByTopic.has(message.topic)) {
      throw new Error('Presence topic is not subscribed');
    }

    await this.topicAuthorizationService.assertTopicAuthorized(
      socketState.authContext,
      message.topic,
    );

    if (!this.isPresenceTopic(message.topic)) {
      throw new Error('Presence updates require a presence topic');
    }

    const identity = this.toPresenceIdentity(socketState);

    if (message.event === 'heartbeat') {
      await this.presenceService.heartbeat(identity);
    } else {
      await this.presenceService.setTyping(
        identity,
        message.event === 'typing-started',
        message.typingContext,
      );
    }

    this.sendEnvelope(webSocket, {
      topic: message.topic,
      seq: 0,
      type: 'ack',
      payload: { action: 'presence-updated', event: message.event },
    });
  }

  private async refreshPresence(
    socketState: RealtimeSocketState,
  ): Promise<void> {
    if (
      !isDefined(socketState.authContext) ||
      ![...socketState.subscriptionsByTopic.keys()].some((topic) =>
        this.isPresenceTopic(topic),
      )
    ) {
      return;
    }

    await this.presenceService.heartbeat(this.toPresenceIdentity(socketState));
  }

  private async leavePresence(socketState: RealtimeSocketState): Promise<void> {
    if (
      !isDefined(socketState.authContext) ||
      ![...socketState.subscriptionsByTopic.keys()].some((topic) =>
        this.isPresenceTopic(topic),
      )
    ) {
      return;
    }

    await this.presenceService.leave(this.toPresenceIdentity(socketState));
  }

  private toPresenceIdentity(socketState: RealtimeSocketState) {
    if (!isDefined(socketState.authContext)) {
      throw new Error('Realtime socket is not authenticated');
    }

    return {
      workspaceId: socketState.authContext.workspaceId,
      userId: socketState.authContext.userId,
      workspaceMemberId: socketState.authContext.workspaceMemberId,
      connectionId: socketState.connectionId,
    };
  }

  private isPresenceTopic(topic: string): boolean {
    try {
      return parseRealtimeTopic(topic).kind === 'presence';
    } catch {
      return false;
    }
  }

  private sendEnvelope(
    webSocket: RealtimeHeartbeatSocket,
    envelope: RealtimeEnvelope,
  ): void {
    if (webSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    webSocket.send(JSON.stringify(envelope));
  }

  // The topic is echoed back so the client can attribute the failure to the
  // subscribe that caused it instead of reporting a bare transport error.
  private sendError(
    webSocket: RealtimeHeartbeatSocket,
    message: string,
    topic?: string,
  ): void {
    this.sendEnvelope(webSocket, {
      topic: topic ?? '',
      seq: 0,
      type: 'error',
      payload: { message },
    });
  }
}
