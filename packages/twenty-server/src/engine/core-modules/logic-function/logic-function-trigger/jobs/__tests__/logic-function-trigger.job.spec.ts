import { Logger } from '@nestjs/common';

import { LogicFunctionTriggerJob } from 'src/engine/core-modules/logic-function/logic-function-trigger/jobs/logic-function-trigger.job';
import {
  LogicFunctionExecutionException,
  LogicFunctionExecutionExceptionCode,
  LogicFunctionExecutorService,
} from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import {
  LogicFunctionException,
  LogicFunctionExceptionCode,
} from 'src/engine/metadata-modules/logic-function/logic-function.exception';

const buildJobContext = () => ({
  retryLimit: 3,
  updateData: jest.fn(),
});

describe('LogicFunctionTriggerJob', () => {
  let logicFunctionExecutorService: LogicFunctionExecutorService;
  let logicFunctionTriggerJob: LogicFunctionTriggerJob;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    logicFunctionExecutorService = {
      execute: jest.fn(),
    } as unknown as LogicFunctionExecutorService;

    logicFunctionTriggerJob = new LogicFunctionTriggerJob(
      logicFunctionExecutorService,
    );
  });

  it('drains (does not throw) when the logic function no longer exists after an app uninstall', async () => {
    (logicFunctionExecutorService.execute as jest.Mock).mockRejectedValue(
      new LogicFunctionExecutionException(
        'Logic function with id abc not found',
        LogicFunctionExecutionExceptionCode.LOGIC_FUNCTION_NOT_FOUND,
      ),
    );

    const jobContext = buildJobContext();

    await expect(
      logicFunctionTriggerJob.handle(
        {
          logicFunctionId: 'abc',
          workspaceId: 'workspace-1',
          payload: {},
        },
        // oxlint-disable-next-line typescript/no-explicit-any
        jobContext as any,
      ),
    ).resolves.toBeUndefined();

    expect(logicFunctionExecutorService.execute).toHaveBeenCalledTimes(1);
  });

  it('still rethrows failures that are not uninstall-related', async () => {
    (logicFunctionExecutorService.execute as jest.Mock).mockRejectedValue(
      new Error('unexpected execution crash'),
    );

    const jobContext = buildJobContext();

    await expect(
      logicFunctionTriggerJob.handle(
        {
          logicFunctionId: 'abc',
          workspaceId: 'workspace-1',
          payload: {},
        },
        // oxlint-disable-next-line typescript/no-explicit-any
        jobContext as any,
      ),
    ).rejects.toThrow('unexpected execution crash');
  });

  it('drains a stopped application exactly as before (regression guard)', async () => {
    (logicFunctionExecutorService.execute as jest.Mock).mockRejectedValue(
      new LogicFunctionException(
        'Application stopped',
        LogicFunctionExceptionCode.LOGIC_FUNCTION_DISABLED,
      ),
    );

    const jobContext = buildJobContext();

    await expect(
      logicFunctionTriggerJob.handle(
        {
          logicFunctionId: 'abc',
          workspaceId: 'workspace-1',
          payload: {},
        },
        // oxlint-disable-next-line typescript/no-explicit-any
        jobContext as any,
      ),
    ).resolves.toBeUndefined();
  });
});
