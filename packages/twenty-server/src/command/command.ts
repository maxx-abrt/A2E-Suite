import { CommandFactory } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { isDefined } from 'twenty-shared/utils';

import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { LoggerService } from 'src/engine/core-modules/logger/logger.service';
import { shouldCaptureException } from 'src/engine/utils/global-exception-handler.util';

import { CommandModule } from './command.module';

const COMMAND_SHUTDOWN_TIMEOUT_MS = 30_000;

async function bootstrap() {
  const logger = new Logger('Command');
  let exceptionHandlerService: ExceptionHandlerService | undefined;
  const errorHandler = (err: Error) => {
    logger.error(err?.message, err?.name);

    if (shouldCaptureException(err) && isDefined(exceptionHandlerService)) {
      exceptionHandlerService.captureExceptions([err]);
    }

    process.exitCode = 1;
  };

  const app = await CommandFactory.createWithoutRunning(CommandModule, {
    logger: ['error', 'warn', 'log'],
    bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
    errorHandler,
    serviceErrorHandler: errorHandler,
  });
  const loggerService = app.get(LoggerService);
  exceptionHandlerService = app.get(ExceptionHandlerService);

  app.useLogger(loggerService);

  try {
    await CommandFactory.runApplication(app);
  } finally {
    logger.log('Command finished; closing application context');
    // This deadline covers cleanup only; running migrations keep their full execution time.
    const shutdownTimeout = setTimeout(() => {
      logger.error(
        `Application context cleanup exceeded ${COMMAND_SHUTDOWN_TIMEOUT_MS}ms; exiting with failure`,
      );
      process.exit(1);
    }, COMMAND_SHUTDOWN_TIMEOUT_MS);

    try {
      await app.close();
      logger.log('Application context closed');
    } finally {
      clearTimeout(shutdownTimeout);
    }
  }
}

async function bootstrapAndExit() {
  try {
    await bootstrap();
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
      'Command',
    );
    process.exitCode = 1;
  }

  await Promise.all([
    new Promise<void>((resolve) => process.stdout.write('', () => resolve())),
    new Promise<void>((resolve) => process.stderr.write('', () => resolve())),
  ]);
  // Finite CLI commands must release the entrypoint even if a library retains a socket.
  process.exit(process.exitCode ?? 0);
}

void bootstrapAndExit();
