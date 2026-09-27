import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { CALENDAR_REMINDER_CRON_PATTERN } from 'src/engine/core-modules/calendar/constants/calendar-reminder-cron-pattern.constant';
import {
  CalendarReminderJob,
  type CalendarReminderJobData,
} from 'src/engine/core-modules/calendar/jobs/calendar-reminder.job';
import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// Fans out one CalendarReminderJob per active workspace so a slow or failing
// workspace never delays reminders in the others (trash-cleanup precedent).
@Injectable()
@Processor(MessageQueue.cronQueue)
export class CalendarReminderCronJob {
  private readonly logger = new Logger(CalendarReminderCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
  ) {}

  @Process(CalendarReminderCronJob.name)
  @SentryCronMonitor(
    CalendarReminderCronJob.name,
    CALENDAR_REMINDER_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    const activeWorkspaces = await this.workspaceRepository.find({
      where: {
        activationStatus: WorkspaceActivationStatus.ACTIVE,
      },
      select: ['id'],
      order: { id: 'ASC' },
    });

    for (const activeWorkspace of activeWorkspaces) {
      try {
        await this.messageQueueService.add<CalendarReminderJobData>(
          CalendarReminderJob.name,
          { workspaceId: activeWorkspace.id },
        );
      } catch (error) {
        this.exceptionHandlerService.captureExceptions([error], {
          workspace: {
            id: activeWorkspace.id,
          },
        });
      }
    }

    this.logger.debug(
      `Enqueued calendar reminder jobs for ${activeWorkspaces.length} workspace(s)`,
    );
  }
}
