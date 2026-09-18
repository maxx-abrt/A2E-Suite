import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeyValuePairModule } from 'src/engine/core-modules/key-value-pair/key-value-pair.module';
import { NotificationRequestedListener } from 'src/engine/core-modules/notification/listeners/notification-requested.listener';
import { NotificationEntity } from 'src/engine/core-modules/notification/notification.entity';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';

@Module({
  imports: [KeyValuePairModule, TypeOrmModule.forFeature([NotificationEntity])],
  exports: [NotificationService],
  providers: [NotificationService, NotificationRequestedListener],
})
export class NotificationModule {}
