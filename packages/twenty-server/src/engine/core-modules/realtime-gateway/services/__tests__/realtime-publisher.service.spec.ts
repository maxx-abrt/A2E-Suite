import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { REALTIME_REDIS_CHANNEL_PREFIX } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.constants';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

type MessageHandler = (channel: string, message: string) => void;

// In-process stand-in for Redis pub/sub: several RealtimePublisherService
// instances share one bus, which is what lets the spec prove cross-instance
// fan-out without a live Redis. Each client keeps its own subscription set
// and message handlers, mirroring how `duplicate()` isolates connections.
class FakeRedisBus {
  // Subscribe failures live on the bus because the service subscribes through
  // a `duplicate()` connection the spec has no direct handle on.
  failSubscribeTimes = 0;
  private readonly subscribersByChannel = new Map<
    string,
    Set<FakeRedisClient>
  >();

  subscribeClient(channel: string, client: FakeRedisClient): void {
    const subscribers = this.subscribersByChannel.get(channel) ?? new Set();

    subscribers.add(client);
    this.subscribersByChannel.set(channel, subscribers);
  }

  unsubscribeClient(channel: string, client: FakeRedisClient): void {
    this.subscribersByChannel.get(channel)?.delete(client);
  }

  deliver(channel: string, message: string): void {
    for (const client of this.subscribersByChannel.get(channel) ?? []) {
      client.deliver(channel, message);
    }
  }

  getSubscribedChannels(): string[] {
    return [...this.subscribersByChannel.keys()];
  }
}

class FakeRedisClient {
  readonly subscribeCalls: string[] = [];
  readonly unsubscribeCalls: string[] = [];
  readonly publishCalls: { channel: string; message: string }[] = [];
  readonly duplicates: FakeRedisClient[] = [];
  failPublish = false;
  private readonly messageHandlers: MessageHandler[] = [];
  private readonly subscribedChannels = new Set<string>();

  constructor(private readonly bus: FakeRedisBus) {}

  on(event: string, handler: MessageHandler): void {
    if (event === 'message') {
      this.messageHandlers.push(handler);
    }
  }

  async subscribe(channel: string): Promise<void> {
    this.subscribeCalls.push(channel);

    if (this.bus.failSubscribeTimes > 0) {
      this.bus.failSubscribeTimes -= 1;
      throw new Error('redis subscribe unavailable');
    }

    this.subscribedChannels.add(channel);
    this.bus.subscribeClient(channel, this);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.unsubscribeCalls.push(channel);
    this.subscribedChannels.delete(channel);
    this.bus.unsubscribeClient(channel, this);
  }

  async publish(channel: string, message: string): Promise<void> {
    this.publishCalls.push({ channel, message });

    if (this.failPublish) {
      throw new Error('redis publish unavailable');
    }

    this.bus.deliver(channel, message);
  }

  duplicate(): FakeRedisClient {
    const duplicate = new FakeRedisClient(this.bus);

    this.duplicates.push(duplicate);

    return duplicate;
  }

  async quit(): Promise<void> {}

  deliver(channel: string, message: string): void {
    if (!this.subscribedChannels.has(channel)) {
      return;
    }

    for (const handler of this.messageHandlers) {
      handler(channel, message);
    }
  }
}

const createPublisher = (
  client: FakeRedisClient,
  metricsService = { incrementCounterBy: jest.fn() },
): RealtimePublisherService =>
  new RealtimePublisherService(
    {
      getClient: () => client,
    } as unknown as RedisClientService,
    metricsService as never,
  );

// Redis unsubscribe is fire-and-forget in the service, so the spec flushes
// the microtask queue before asserting release behavior.
const flushMicrotasks = async (): Promise<void> => {
  for (let iteration = 0; iteration < 5; iteration += 1) {
    await Promise.resolve();
  }
};

const redisChannel = (topic: string) =>
  `${REALTIME_REDIS_CHANNEL_PREFIX}${topic}`;

describe('RealtimePublisherService', () => {
  it('publishes the serialized envelope to the prefixed Redis channel', async () => {
    const client = new FakeRedisClient(new FakeRedisBus());
    const publisher = createPublisher(client);

    await publisher.publish('workspace:abc', { hello: 'world' });

    expect(client.publishCalls).toEqual([
      {
        channel: redisChannel('workspace:abc'),
        message: JSON.stringify({
          topic: 'workspace:abc',
          seq: 0,
          type: 'event',
          payload: { hello: 'world' },
        }),
      },
    ]);
  });

  it('swallows a Redis publish failure instead of rejecting the caller', async () => {
    const client = new FakeRedisClient(new FakeRedisBus());

    client.failPublish = true;

    const publisher = createPublisher(client);

    await expect(
      publisher.publish('workspace:abc', { hello: 'world' }),
    ).resolves.toBeUndefined();
  });

  it('increments the published counter only for successful publishes', async () => {
    const metricsService = { incrementCounterBy: jest.fn() };
    const successClient = new FakeRedisClient(new FakeRedisBus());
    const failingClient = new FakeRedisClient(new FakeRedisBus());

    failingClient.failPublish = true;

    await createPublisher(successClient, metricsService).publish(
      'workspace:abc',
      { hello: 'world' },
    );
    await createPublisher(failingClient, metricsService).publish(
      'workspace:abc',
      { hello: 'world' },
    );

    expect(metricsService.incrementCounterBy).toHaveBeenCalledTimes(1);
    expect(metricsService.incrementCounterBy).toHaveBeenCalledWith({
      key: MetricsKeys.RealtimeMessagePublished,
      amount: 1,
    });
  });

  it('fans out across instances sharing Redis, without cross-topic leakage', async () => {
    const bus = new FakeRedisBus();
    const firstInstance = createPublisher(new FakeRedisClient(bus));
    const secondInstance = createPublisher(new FakeRedisClient(bus));
    const firstReceived: unknown[] = [];
    const otherTopicReceived: unknown[] = [];

    await secondInstance.subscribeTopic('topic-x', ({ payload }) =>
      firstReceived.push(payload),
    );
    await secondInstance.subscribeTopic('topic-y', ({ payload }) =>
      otherTopicReceived.push(payload),
    );

    await firstInstance.publish('topic-x', { from: 'first-instance' });

    expect(firstReceived).toEqual([{ from: 'first-instance' }]);
    expect(otherTopicReceived).toEqual([]);
  });

  it('subscribes Redis once per topic and delivers to every subscriber', async () => {
    const client = new FakeRedisClient(new FakeRedisBus());
    const publisher = createPublisher(client);
    const firstReceived: unknown[] = [];
    const secondReceived: unknown[] = [];

    await publisher.subscribeTopic('topic-x', ({ payload }) =>
      firstReceived.push(payload),
    );
    await publisher.subscribeTopic('topic-x', ({ payload }) =>
      secondReceived.push(payload),
    );

    expect(client.duplicates[0]?.subscribeCalls).toEqual([
      redisChannel('topic-x'),
    ]);

    await publisher.publish('topic-x', 1);

    expect(firstReceived).toEqual([1]);
    expect(secondReceived).toEqual([1]);
  });

  it('unsubscribes a single subscriber, then releases the Redis topic', async () => {
    const client = new FakeRedisClient(new FakeRedisBus());
    const publisher = createPublisher(client);
    const firstReceived: unknown[] = [];
    const secondReceived: unknown[] = [];

    const unsubscribeFirst = await publisher.subscribeTopic(
      'topic-x',
      ({ payload }) => firstReceived.push(payload),
    );
    const unsubscribeSecond = await publisher.subscribeTopic(
      'topic-x',
      ({ payload }) => secondReceived.push(payload),
    );

    const subscriberClient = client.duplicates[0];

    unsubscribeFirst();
    await publisher.publish('topic-x', 1);

    expect(firstReceived).toEqual([]);
    expect(secondReceived).toEqual([1]);
    expect(subscriberClient?.unsubscribeCalls).toEqual([]);

    unsubscribeSecond();
    await flushMicrotasks();

    expect(subscriberClient?.unsubscribeCalls).toEqual([
      redisChannel('topic-x'),
    ]);

    await publisher.publish('topic-x', 2);

    expect(secondReceived).toEqual([1]);
  });

  it('recovers a topic after a rejected subscribe without duplicate delivery', async () => {
    const bus = new FakeRedisBus();
    const client = new FakeRedisClient(bus);

    bus.failSubscribeTimes = 1;

    const publisher = createPublisher(client);
    const received: unknown[] = [];

    await expect(
      publisher.subscribeTopic('topic-x', ({ payload }) =>
        received.push(payload),
      ),
    ).rejects.toThrow('redis subscribe unavailable');

    await publisher.subscribeTopic('topic-x', ({ payload }) =>
      received.push(payload),
    );

    await publisher.publish('topic-x', 'after-recovery');

    expect(received).toEqual(['after-recovery']);
    expect(client.duplicates[0]?.subscribeCalls).toEqual([
      redisChannel('topic-x'),
      redisChannel('topic-x'),
    ]);
    expect(bus.getSubscribedChannels()).toEqual([redisChannel('topic-x')]);
  });
});
