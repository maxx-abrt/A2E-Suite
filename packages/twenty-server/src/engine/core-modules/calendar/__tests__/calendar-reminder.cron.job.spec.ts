import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { type Repository } from 'typeorm';

import { CalendarReminderCronJob } from 'src/engine/core-modules/calendar/crons/jobs/calendar-reminder.cron.job';
import { CalendarReminderJob } from 'src/engine/core-modules/calendar/jobs/calendar-reminder.job';
import { type ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { type MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const buildCronJob = ({
  workspaces = [{ id: 'workspace-a' }, { id: 'workspace-b' }],
  add = jest.fn().mockResolvedValue(undefined),
}: {
  workspaces?: Array<{ id: string }>;
  add?: jest.Mock;
} = {}) => {
  const find = jest.fn().mockResolvedValue(workspaces);
  const captureExceptions = jest.fn();

  const cronJob = new CalendarReminderCronJob(
    { find } as unknown as Repository<WorkspaceEntity>,
    { add } as unknown as MessageQueueService,
    { captureExceptions } as unknown as ExceptionHandlerService,
  );

  return { cronJob, find, add, captureExceptions };
};

describe('CalendarReminderCronJob', () => {
  it('enqueues one reminder job per active workspace', async () => {
    const { cronJob, find, add } = buildCronJob();

    await cronJob.handle();

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
      }),
    );
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(1, CalendarReminderJob.name, {
      workspaceId: 'workspace-a',
    });
    expect(add).toHaveBeenNthCalledWith(2, CalendarReminderJob.name, {
      workspaceId: 'workspace-b',
    });
  });

  it('keeps enqueuing the other workspaces when one enqueue fails', async () => {
    const add = jest
      .fn()
      .mockRejectedValueOnce(new Error('redis busy'))
      .mockResolvedValue(undefined);
    const { cronJob, captureExceptions } = buildCronJob({ add });

    await cronJob.handle();

    expect(add).toHaveBeenCalledTimes(2);
    expect(captureExceptions).toHaveBeenCalledWith([expect.any(Error)], {
      workspace: { id: 'workspace-a' },
    });
  });
});
