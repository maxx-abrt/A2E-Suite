import {
  type RealtimeConnectionManager,
  type WebSocketLike,
} from '~/modules/realtime/utils/realtimeConnectionManager';

type InMemorySocket = WebSocketLike & {
  onopen: (() => void) | null;
  onmessage: ((messageEvent: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  terminate: () => void;
};

export type RealtimeMockServerHarness = {
  install: (manager: RealtimeConnectionManager) => void;
  broadcast: (topic: string, payload: unknown) => void;
  getLastSentMessage: () => string | undefined;
  getSentMessages: () => string[];
  getClientCount: () => number;
  terminateClient: () => void;
};

// In-memory stand-in for the gateway (jsdom-safe): drives the connection
// manager through its actual open/message/close handler flow — including
// reconnect — without a real socket. The real wire protocol is covered by
// the server integration suite.
export const createRealtimeMockServerHarness =
  (): RealtimeMockServerHarness => {
    let client: InMemorySocket | null = null;

    const sentMessages: string[] = [];

    const makeClient = (): InMemorySocket => {
      const socket: InMemorySocket = {
        readyState: 0,
        OPEN: 1,
        send: (data: string) => {
          sentMessages.push(data);
        },
        close: () => {
          if (socket.readyState === 3) {
            return;
          }

          socket.readyState = 3;
          socket.onclose?.();
        },
        terminate: () => {
          socket.readyState = 3;
          socket.onclose?.();
        },
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };

      return socket;
    };

    return {
      install: (manager) => {
        manager.setWebSocketFactoryForTesting(() => {
          const newClient = makeClient();

          client = newClient;

          // Open asynchronously like a real handshake would.
          setTimeout(() => {
            newClient.readyState = 1;
            newClient.onopen?.();
          }, 0);

          return newClient;
        });
      },
      broadcast: (topic, payload) => {
        const message = JSON.stringify({
          topic,
          seq: sentMessages.length,
          type: 'event',
          payload,
        });

        client?.onmessage?.({ data: message });
      },
      getLastSentMessage: () => sentMessages.at(-1),
      getSentMessages: () => [...sentMessages],
      getClientCount: () => (isClientDefined(client) ? 1 : 0),
      terminateClient: () => {
        client?.terminate();
      },
    };
  };

const isClientDefined = (
  value: InMemorySocket | null,
): value is InMemorySocket => value !== null;
