import IORedis from 'ioredis';

import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

// Fan-out is what makes `/realtime` work once more than one process (server
// or worker) is running: a publish on one instance must reach sockets
// subscribed through another. This spec boots no HTTP/ws server — only two
// RealtimePublisherService instances over the real Redis bus — so it proves
// the multi-instance contract without the isolated gateway harness.
describe('Realtime publisher fan-out (isolated, real Redis)', () => {
  let redisClient: IORedis;

  const createPublisher = (): RealtimePublisherService =>
    new RealtimePublisherService(
      {
        getClient: () => redisClient,
      } as unknown as RedisClientService,
      { incrementCounterBy: () => {} } as never,
    );

  const uniqueTopic = (name: string) =>
    `${name}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  beforeAll(() => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    redisClient = new IORedis(redisUrl, { lazyConnect: false });
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('delivers a publish from one instance to a subscriber on another', async () => {
    const publishingInstance = createPublisher();
    const subscribingInstance = createPublisher();
    const topic = uniqueTopic('fanout');
    const received: unknown[] = [];

    await subscribingInstance.subscribeTopic(topic, ({ payload }) => {
      received.push(payload);
    });

    await publishingInstance.publish(topic, { hello: 'cross-instance' });
    await sleep(50);

    expect(received).toEqual([{ hello: 'cross-instance' }]);

    await publishingInstance.onModuleDestroy();
    await subscribingInstance.onModuleDestroy();
  });

  it('stops delivering once the subscribing instance releases the topic', async () => {
    const publishingInstance = createPublisher();
    const subscribingInstance = createPublisher();
    const topic = uniqueTopic('release');
    const received: unknown[] = [];

    const unsubscribe = await subscribingInstance.subscribeTopic(
      topic,
      ({ payload }) => {
        received.push(payload);
      },
    );

    await publishingInstance.publish(topic, 'first');
    await sleep(50);

    expect(received).toEqual(['first']);

    unsubscribe();
    // Releasing the last local subscriber unsubscribes Redis asynchronously;
    // give that round-trip a moment before publishing again.
    await sleep(50);

    await publishingInstance.publish(topic, 'second');
    await sleep(50);

    expect(received).toEqual(['first']);

    await publishingInstance.onModuleDestroy();
    await subscribingInstance.onModuleDestroy();
  });
});
