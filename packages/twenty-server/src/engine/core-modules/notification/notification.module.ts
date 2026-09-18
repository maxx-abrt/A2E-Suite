import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { KeyValuePairModule } from 'src/engine/core-modules/key-value-pair/key-value-pair.module';
import { NotificationWatchListener } from 'src/engine/core-modules/notification/listeners/notification-watch.listener';
import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { NotificationWatchEntity } from 'src/engine/core-modules/notification/notification-watch.entity';
import { NotificationWatchResolver } from 'src/engine/core-modules/notification/notification-watch.resolver';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationResolver } from 'src/engine/core-modules/notification/notification.resolver';
import { NotificationEmailSenderService } from 'src/engine/core-modules/notification/services/notification-email-sender.service';
import { NotificationRealtimePublisherService } from 'src/engine/core-modules/notification/services/notification-realtime-publisher.service';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { RealtimeGatewayModule } from 'src/engine/core-modules/realtime-gateway/realtime-gateway.module';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Module({
  imports: [
    KeyValuePairModule,
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationWatchEntity,
      UserEntity,
      WorkspaceEntity,
    ]),
    RealtimeGatewayModule,
    EmailModule,
    WorkspaceDomainsModule,
    UserWorkspaceModule,
    WorkspaceCacheModule,
  ],
  exports: [NotificationService, NotificationWatchService],
  providers: [
    NotificationService,
    NotificationResolver,
    NotificationRequestedListener,
    NotificationRealtimePublisherService,
    NotificationEmailSenderService,
    NotificationWatchService,
    NotificationWatchResolver,
    NotificationWatchListener,
  ],
})
export class NotificationModule {}
