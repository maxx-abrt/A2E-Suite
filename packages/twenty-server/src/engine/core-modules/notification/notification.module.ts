import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { KeyValuePairModule } from 'src/engine/core-modules/key-value-pair/key-value-pair.module';
import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationResolver } from 'src/engine/core-modules/notification/notification.resolver';
import { NotificationEmailSenderService } from 'src/engine/core-modules/notification/services/notification-email-sender.service';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Module({
  imports: [
    KeyValuePairModule,
    TypeOrmModule.forFeature([NotificationEntity, UserEntity, WorkspaceEntity]),
    RealtimeGatewayModule,
    EmailModule,
    WorkspaceDomainsModule,
  ],
  exports: [NotificationService],
  providers: [
    NotificationService,
    NotificationResolver,
    NotificationRequestedListener,
    NotificationRealtimePublisherService,
    NotificationEmailSenderService,
  ],
})
export class NotificationModule {}
