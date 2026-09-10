import { Module } from '@nestjs/common';

import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { PresenceResolver } from 'src/engine/core-modules/realtime-gateway/presence.resolver';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';

// Track A core primitive (blueprint §4). Mounted once from CoreEngineModule;
// the queue worker inherits it harmlessly (no HTTP adapter → service no-ops).
@Module({
  imports: [JwtModule, RedisClientModule],
  providers: [
    PresenceResolver,
    PresenceService,
    RealtimeGatewayService,
    RealtimePublisherService,
    RealtimeTopicAuthorizationService,
  ],
  exports: [
    PresenceService,
    RealtimePublisherService,
    RealtimeTopicAuthorizationService,
  ],
})
export class RealtimeGatewayModule {}
