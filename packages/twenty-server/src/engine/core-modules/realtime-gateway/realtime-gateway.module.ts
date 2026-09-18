import { Module } from '@nestjs/common';

import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { PresenceResolver } from 'src/engine/core-modules/realtime-gateway/presence.resolver';
import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAccessService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { UserSessionModule } from 'src/engine/core-modules/user-session/user-session.module';
import { CoreEntityCacheModule } from 'src/engine/core-entity-cache/core-entity-cache.module';
import { TwentyOrmModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

// Track A core primitive (blueprint §4). Mounted once from CoreEngineModule;
// the queue worker inherits it harmlessly (no HTTP adapter → service no-ops).
// UserSessionModule/WorkspaceCacheModule back the F02 repair: subscribes
// authenticate through the same session resolution and member cache as HTTP.
@Module({
  imports: [
    JwtModule,
    RedisClientModule,
    MetricsModule,
    UserSessionModule,
    WorkspaceCacheModule,
    CoreEntityCacheModule,
    TwentyOrmModule,
  ],
  providers: [
    PresenceResolver,
    PresenceService,
    RealtimeGatewayService,
    RealtimePublisherService,
    RealtimeTopicAccessService,
    RealtimeTopicAuthorizationService,
  ],
  exports: [
    PresenceService,
    RealtimePublisherService,
    RealtimeTopicAuthorizationService,
  ],
})
export class RealtimeGatewayModule {}
