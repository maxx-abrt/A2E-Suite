import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeyValuePairModule } from 'src/engine/core-modules/key-value-pair/key-value-pair.module';
import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';

@Module({
  imports: [
    KeyValuePairModule,
    TypeOrmModule.forFeature([NotificationEntity]),
    RealtimeGatewayModule,
  ],
  exports: [NotificationService],
  providers: [
    NotificationService,
    NotificationRequestedListener,
    NotificationRealtimePublisherService,
  ],
})
export class NotificationModule {}
