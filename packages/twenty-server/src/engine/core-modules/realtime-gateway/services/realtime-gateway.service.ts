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
import { WebSocketServer, type WebSocket } from 'ws';

import {
  REALTIME_HEARTBEAT_INTERVAL_MS,
  REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET,
  REALTIME_WS_PATH,
} from 'src/engine/core-modules/realtime-gateway/realtime-gateway.constants';
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

type RealtimeSocketState = {
  authContext: RealtimeAuthenticatedSocketContext | null;
  connectionId: string;
  subscriptionsByTopic: Map<string, () => void>;
  seqByTopic: Map<string, number>;
  isAlive: boolean;
};

const EMPTY_SOCKET_CONTEXT: RealtimeAuthenticatedSocketContext | null = null;

// Raw ws server mounted on the Nest HTTP server (same port) at /realtime.
// Auth happens at upgrade via the session cookie AND on every subscribe via
// the re-sent access token, so a stolen upgrade never yields readable data.
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
      for (const webSocket of this.enumerateClients()) {
        const socketState = this.socketStates.get(webSocket);

        if (!isDefined(socketState) || !socketState.isAlive) {
          webSocket.terminate();

          continue;
        }

        socketState.isAlive = false;
        webSocket.ping();
      }
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

  private handleConnection(
    webSocket: WebSocket,
    request: IncomingMessage,
  ): void {
    this.socketStates.set(webSocket, {
      authContext: EMPTY_SOCKET_CONTEXT,
      connectionId: randomUUID(),
      subscriptionsByTopic: new Map(),
      seqByTopic: new Map(),
      isAlive: true,
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
      const authContext = isDefined(socketState.authContext)
        ? socketState.authContext
        : await this.topicAuthorizationService.authenticate(
            parsed.token ?? this.extractSessionTokenFromUpgradeCookie(request),
          );

      this.topicAuthorizationService.assertTopicAuthorized(
        authContext,
        parsed.topic,
      );

      if (!isDefined(socketState.authContext)) {
        socketState.authContext = authContext;
      }

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

    this.topicAuthorizationService.assertTopicAuthorized(
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

  private extractSessionTokenFromUpgradeCookie(
    request: IncomingMessage,
  ): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!isDefined(cookieHeader)) {
      return undefined;
    }

    for (const cookiePart of cookieHeader.split(';')) {
      const separatorIndex = cookiePart.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const cookieName = cookiePart.slice(0, separatorIndex).trim();

      if (
        cookieName === 'twenty-session' ||
        cookieName === '__Host-twenty-session'
      ) {
        return cookiePart.slice(separatorIndex + 1).trim();
      }
    }

    return undefined;
  }

  private sendEnvelope(webSocket: WebSocket, envelope: RealtimeEnvelope): void {
    if (webSocket.readyState !== webSocket.OPEN) {
      return;
    }

    webSocket.send(JSON.stringify(envelope));
  }

  private sendError(webSocket: WebSocket, message: string): void {
    this.sendEnvelope(webSocket, {
      topic: '',
      seq: 0,
      type: 'error',
      payload: { message },
    });
  }
}
