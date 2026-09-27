import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CalendarReminderCronCommand } from 'src/engine/core-modules/calendar/crons/commands/calendar-reminder.cron.command';
import { CalendarReminderCronJob } from 'src/engine/core-modules/calendar/crons/jobs/calendar-reminder.cron.job';
import { CalendarReminderJob } from 'src/engine/core-modules/calendar/jobs/calendar-reminder.job';
import { CalendarReminderService } from 'src/engine/core-modules/calendar/services/calendar-reminder.service';
import { NotificationModule } from 'src/engine/core-modules/notification/notification.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// P4C.4 reminder delivery: the cron fans out per workspace, the job runs the
// idempotent dispatch pass, the P8 NotificationService owns channels.
@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity]), NotificationModule],
  providers: [
    CalendarReminderService,
    CalendarReminderJob,
    CalendarReminderCronJob,
    CalendarReminderCronCommand,
  ],
  exports: [CalendarReminderCronCommand],
})
export class CalendarReminderModule {}
