import { Command, CommandRunner } from 'nest-commander';

import { CALENDAR_REMINDER_CRON_PATTERN } from 'src/engine/core-modules/calendar/constants/calendar-reminder-cron-pattern.constant';
import { CalendarReminderCronJob } from 'src/engine/core-modules/calendar/crons/jobs/calendar-reminder.cron.job';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

@Command({
  name: 'cron:calendar:reminders',
  description: 'Starts a cron job to dispatch due calendar event reminders',
})
export class CalendarReminderCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: CalendarReminderCronJob.name,
      data: undefined,
      options: {
        repeat: {
          pattern: CALENDAR_REMINDER_CRON_PATTERN,
        },
      },
    });
  }
}
