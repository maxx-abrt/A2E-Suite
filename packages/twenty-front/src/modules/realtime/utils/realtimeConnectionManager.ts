import { isNonEmptyString } from '@sniptt/guards';

import { isDefined } from 'twenty-shared/utils';

import {
  REALTIME_BASE_RECONNECT_DELAY_MS,
  REALTIME_MAX_RECONNECT_ATTEMPTS,
  REALTIME_MAX_RECONNECT_DELAY_MS,
  getRealtimeWsUrl,
} from '~/modules/realtime/constants/RealtimeConstants';
import { type RealtimeConnectionStatus } from '~/modules/realtime/states/realtimeConnectionStatusState';
import { getRealtimeAuthTokenFromCookie } from '~/modules/realtime/utils/getRealtimeAuthToken';

export type RealtimeEnvelope = {
  topic: string;
  seq: number;
  type: 'event' | 'ack' | 'error';
  payload: unknown;
};

type RealtimeTopicListener = (envelope: RealtimeEnvelope) => void;

type RealtimeConnectionListener = (status: RealtimeConnectionStatus) => void;

type PendingSubscription = {
  topic: string;
  token?: string;
};

export type RealtimePresenceUpdate = {
  topic: string;
  event: 'heartbeat' | 'typing-started' | 'typing-stopped';
  typingContext?: string;
};

export type WebSocketLike = {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
  close: () => void;
};

// Single-socket manager: every hook shares one WebSocket with exponential
// backoff reconnect. Subscriptions are re-sent from scratch on reopen so
// reconnect needs no server-side session state. The socket factory is
// injectable so tests/Storybook can drive the manager against an in-memory
// server instead of a real endpoint.
export class RealtimeConnectionManager {
  private createWebSocket: (url: string) => WebSocketLike;

  private webSocket: WebSocketLike | null = null;

  private statusListeners = new Set<RealtimeConnectionListener>();

  private topicListenersByTopic = new Map<string, Set<RealtimeTopicListener>>();

  private pendingSubscriptions: PendingSubscription[] = [];

  private reconnectAttempts = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private isManuallyClosed = false;

  constructor(
    createWebSocket: (url: string) => WebSocketLike = (url) =>
      new WebSocket(url) as unknown as WebSocketLike,
  ) {
    this.createWebSocket = createWebSocket;
  }

  setWebSocketFactoryForTesting(factory: (url: string) => WebSocketLike): void {
    this.createWebSocket = factory;
  }

  getStatus(): RealtimeConnectionStatus {
    if (isDefined(this.webSocket)) {
      if (this.webSocket.readyState === this.webSocket.OPEN) {
        return 'connected';
      }

      if (this.webSocket.readyState === 0) {
        return this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
      }
    }

    return isDefined(this.reconnectTimer) ? 'reconnecting' : 'disconnected';
  }

  onStatusChange(listener: RealtimeConnectionListener): () => void {
    this.statusListeners.add(listener);

    listener(this.getStatus());

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribe(topic: string, listener: RealtimeTopicListener): () => void {
    let topicListeners = this.topicListenersByTopic.get(topic);

    if (!isDefined(topicListeners)) {
      topicListeners = new Set();
      this.topicListenersByTopic.set(topic, topicListeners);
    }

    topicListeners.add(listener);

    this.ensureConnected();
    this.sendSubscribe(topic);

    return () => {
      const currentTopicListeners = this.topicListenersByTopic.get(topic);

      if (!isDefined(currentTopicListeners)) {
        return;
      }

      currentTopicListeners.delete(listener);

      if (currentTopicListeners.size === 0) {
        this.topicListenersByTopic.delete(topic);
        this.sendUnsubscribe(topic);
      }
    };
  }

  sendPresence({
    topic,
    event,
    typingContext,
  }: RealtimePresenceUpdate): boolean {
    if (
      !isDefined(this.webSocket) ||
      this.webSocket.readyState !== this.webSocket.OPEN ||
      !this.topicListenersByTopic.has(topic)
    ) {
      return false;
    }

    this.webSocket.send(
      JSON.stringify({
        action: 'presence',
        topic,
        event,
        ...(isNonEmptyString(typingContext) ? { typingContext } : {}),
      }),
    );

    return true;
  }

  destroy(): void {
    this.isManuallyClosed = true;

    if (isDefined(this.reconnectTimer)) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.webSocket?.close();
    this.webSocket = null;
    this.topicListenersByTopic.clear();
    this.pendingSubscriptions = [];
    this.reconnectAttempts = 0;
    this.isManuallyClosed = false;
  }

  private ensureConnected(): void {
    if (isDefined(this.webSocket) || isDefined(this.reconnectTimer)) {
      return;
    }

    this.openSocket();
  }

  private openSocket(): void {
    if (isDefined(this.webSocket)) {
      return;
    }

    this.emitStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    let webSocket: WebSocketLike;

    try {
      webSocket = this.createWebSocket(getRealtimeWsUrl());
    } catch {
      this.scheduleReconnect();

      return;
    }

    this.webSocket = webSocket;

    // The wire-level handlers are attached by the factory via the weakly
    // typed attach surface below; a plain WebSocket carries them natively.
    const attachable = webSocket as unknown as {
      onopen: (() => void) | null;
      onmessage: ((messageEvent: { data: unknown }) => void) | null;
      onclose: (() => void) | null;
      onerror: (() => void) | null;
    };

    attachable.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitStatus('connected');

      const resubscribeTopics = [
        ...this.topicListenersByTopic.keys(),
        ...this.pendingSubscriptions.map(({ topic }) => topic),
      ];

      const uniqueTopics = [...new Set(resubscribeTopics)];

      this.pendingSubscriptions = [];

      for (const topic of uniqueTopics) {
        this.sendSubscribe(topic);
      }
    };

    attachable.onmessage = (messageEvent) => {
      this.handleMessage(messageEvent.data);
    };

    attachable.onclose = () => {
      this.webSocket = null;

      if (this.isManuallyClosed) {
        this.emitStatus('disconnected');

        return;
      }

      this.scheduleReconnect();
    };

    attachable.onerror = () => {
      webSocket.close();
    };
  }

  private scheduleReconnect(): void {
    if (isDefined(this.reconnectTimer)) {
      return;
    }

    if (this.reconnectAttempts >= REALTIME_MAX_RECONNECT_ATTEMPTS) {
      this.emitStatus('disconnected');

      return;
    }

    const backoffDelayMs = Math.min(
      REALTIME_BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      REALTIME_MAX_RECONNECT_DELAY_MS,
    );

    this.reconnectAttempts += 1;
    this.emitStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, backoffDelayMs);
  }

  private sendSubscribe(topic: string): void {
    if (
      !isDefined(this.webSocket) ||
      this.webSocket.readyState !== this.webSocket.OPEN
    ) {
      if (
        !this.pendingSubscriptions.some(
          (pendingSubscription) => pendingSubscription.topic === topic,
        )
      ) {
        this.pendingSubscriptions.push({ topic });
      }

      return;
    }

    const cookieToken = getRealtimeAuthTokenFromCookie();

    this.webSocket.send(
      JSON.stringify({
        action: 'subscribe',
        topic,
        ...(isNonEmptyString(cookieToken) ? { token: cookieToken } : {}),
      }),
    );
  }

  private sendUnsubscribe(topic: string): void {
    this.pendingSubscriptions = this.pendingSubscriptions.filter(
      (pendingSubscription) => pendingSubscription.topic !== topic,
    );

    if (
      !isDefined(this.webSocket) ||
      this.webSocket.readyState !== this.webSocket.OPEN
    ) {
      return;
    }

    this.webSocket.send(JSON.stringify({ action: 'unsubscribe', topic }));
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }

    let envelope: RealtimeEnvelope;

    try {
      envelope = JSON.parse(raw) as RealtimeEnvelope;
    } catch {
      return;
    }

    if (
      typeof envelope.topic !== 'string' ||
      typeof envelope.seq !== 'number' ||
      !isNonEmptyString(envelope.type)
    ) {
      return;
    }

    if (envelope.type !== 'event') {
      return;
    }

    const topicListeners = this.topicListenersByTopic.get(envelope.topic);

    if (!isDefined(topicListeners)) {
      return;
    }

    for (const topicListener of topicListeners) {
      topicListener(envelope);
    }
  }

  private emitStatus(status: RealtimeConnectionStatus): void {
    for (const statusListener of this.statusListeners) {
      statusListener(status);
    }
  }
}

export const realtimeConnectionManager = new RealtimeConnectionManager();
