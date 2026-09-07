import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

import { REALTIME_REDIS_CHANNEL_PREFIX } from '../realtime-gateway.constants';
import { serializeRealtimeEnvelope } from '../utils/serialize-realtime-envelope.util';

type RealtimeSubscriber = (envelope: {
  topic: string;
  seq: number;
  payload: unknown;
}) => void;

// Fan-out through Redis pub/sub on `a2e:rt:<topic>` so any instance (server
// or worker) can publish and every connected socket gets it. Per-socket seq
// bookkeeping lives in the gateway service; this layer only moves bytes.
@Injectable()
export class RealtimePublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisherService.name);
  private readonly subscribersByTopic = new Map<
    string,
    Set<RealtimeSubscriber>
  >();
  private readonly subscribedRedisTopics = new Set<string>();
  private redisSubscriberClient: import('ioredis').Redis | null = null;

  constructor(private readonly redisClientService: RedisClientService) {}

  async publish(topic: string, payload: unknown): Promise<void> {
    const envelope = serializeRealtimeEnvelope({
      topic,
      seq: 0,
      type: 'event',
      payload,
    });

    try {
      await this.redisClientService
        .getClient()
        .publish(`${REALTIME_REDIS_CHANNEL_PREFIX}${topic}`, envelope);
    } catch (error) {
      this.logger.error(`Failed to publish realtime topic ${topic}`, error);
    }
  }

  async subscribeTopic(
    topic: string,
    subscriber: RealtimeSubscriber,
  ): Promise<() => void> {
    const redisTopic = `${REALTIME_REDIS_CHANNEL_PREFIX}${topic}`;

    let topicSubscribers = this.subscribersByTopic.get(topic);

    if (!isDefined(topicSubscribers)) {
      topicSubscribers = new Set();
      this.subscribersByTopic.set(topic, topicSubscribers);
    }

    topicSubscribers.add(subscriber);

    if (!this.subscribedRedisTopics.has(redisTopic)) {
      this.subscribedRedisTopics.add(redisTopic);

      try {
        await this.ensureSubscriberClient().subscribe(redisTopic);
      } catch (error) {
        this.subscribedRedisTopics.delete(redisTopic);
        this.logger.error(
          `Failed to subscribe redis topic ${redisTopic}`,
          error,
        );
      }
    }

    return () => {
      const subscribers = this.subscribersByTopic.get(topic);

      if (!isDefined(subscribers)) {
        return;
      }

      subscribers.delete(subscriber);

      if (subscribers.size === 0) {
        this.subscribersByTopic.delete(topic);
        void this.redisSubscriberClient
          ?.unsubscribe(redisTopic)
          .then(() => {
            this.subscribedRedisTopics.delete(redisTopic);
          })
          .catch(() => {});
      }
    };
  }

  private ensureSubscriberClient(): import('ioredis').Redis {
    if (!isDefined(this.redisSubscriberClient)) {
      this.redisSubscriberClient = this.redisClientService
        .getClient()
        .duplicate();

      this.redisSubscriberClient.on('message', (channel, message) => {
        if (!this.subscribedRedisTopics.has(channel)) {
          return;
        }

        const topic = channel.slice(REALTIME_REDIS_CHANNEL_PREFIX.length);
        const subscribers = this.subscribersByTopic.get(topic);

        if (!isDefined(subscribers)) {
          return;
        }

        let parsed: { seq: number; payload: unknown };

        try {
          parsed = JSON.parse(message);
        } catch {
          return;
        }

        for (const subscriber of subscribers) {
          subscriber({ topic, seq: parsed.seq, payload: parsed.payload });
        }
      });
    }

    return this.redisSubscriberClient;
  }

  async onModuleDestroy(): Promise<void> {
    if (isDefined(this.redisSubscriberClient)) {
      await this.redisSubscriberClient.quit();
      this.redisSubscriberClient = null;
    }
  }
}
