import { Injectable, Logger } from '@nestjs/common';

import { CalendarReminderService } from 'src/engine/core-modules/calendar/services/calendar-reminder.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';

export type CalendarReminderJobData = {
  workspaceId: string;
};

@Injectable()
@Processor(MessageQueue.workspaceQueue)
export class CalendarReminderJob {
  private readonly logger = new Logger(CalendarReminderJob.name);

  constructor(
    private readonly calendarReminderService: CalendarReminderService,
  ) {}

  @Process(CalendarReminderJob.name)
  async handle({ workspaceId }: CalendarReminderJobData): Promise<void> {
    try {
      await this.calendarReminderService.dispatchDueReminders({
        workspaceId,
        now: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Calendar reminder dispatch failed for workspace ${workspaceId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
