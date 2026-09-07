import { Module } from '@nestjs/common';

import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';

// Track A core primitive (blueprint §4). Mounted once from CoreEngineModule;
// the queue worker inherits it harmlessly (no HTTP adapter → service no-ops).
@Module({
  imports: [JwtModule, RedisClientModule],
  providers: [
    RealtimeGatewayService,
    RealtimePublisherService,
    RealtimeTopicAuthorizationService,
  ],
  exports: [RealtimePublisherService, RealtimeTopicAuthorizationService],
})
export class RealtimeGatewayModule {}
