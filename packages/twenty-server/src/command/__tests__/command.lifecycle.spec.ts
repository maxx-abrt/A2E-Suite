import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { transformSync } from '@swc/core';

const commandPath = join(__dirname, '..', 'command.ts');
const compiledCommand = transformSync(readFileSync(commandPath, 'utf8'), {
  filename: commandPath,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
}).code;

const runCommandProcess = (mode: string) =>
  spawnSync(
    process.execPath,
    [
      '-e',
      `
const Module = require('node:module');
const originalLoad = Module._load;
const originalSetTimeout = global.setTimeout;
global.setTimeout = (callback, duration, ...arguments_) =>
  originalSetTimeout(callback, duration === 30000 ? 50 : duration, ...arguments_);
const mode = process.env.COMMAND_LIFECYCLE_TEST_MODE;
const logger = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};
class Logger {
  log(message) { logger.log(message); }
  error(message) { logger.error(message); }
  static error(message) { logger.error(message); }
}
const application = {
  get: () => ({ ...logger, captureExceptions: () => {} }),
  useLogger: () => {},
  close: async () => {
    console.log('cleanup called');
    if (mode === 'cleanup-rejects') throw new Error('cleanup rejected');
    if (mode === 'cleanup-stalls') return new Promise(() => {});
  },
};
const factory = {
  createWithoutRunning: async (_module, options) => {
    if (mode === 'initialization-fails') {
      options.errorHandler(new Error('initialization failed'));
      throw new Error('initialization failed');
    }
    factory.options = options;
    return application;
  },
  runApplication: async () => {
    // An unmanaged library handle must not hold a completed CLI open.
    setInterval(() => {}, 1000);
    if (mode === 'command-rejects') throw new Error('command rejected');
    if (mode === 'handled-failure') factory.options.errorHandler(new Error('command failed'));
    if (mode === 'interrupted') process.exitCode = 143;
    if (mode === 'slow-command') await new Promise(resolve => setTimeout(resolve, 100));
    if (mode === 'large-output') process.stdout.write('x'.repeat(512 * 1024));
    console.log('command completed');
  },
};
Module._load = function(request, parent, isMain) {
  if (request === 'nest-commander') return { CommandFactory: factory };
  if (request === '@nestjs/common') return { Logger };
  if (request === 'twenty-shared/utils') return { isDefined: value => value != null };
  if (request.endsWith('global-exception-handler.util')) return { shouldCaptureException: () => true };
  if (request.endsWith('exception-handler.service')) return { ExceptionHandlerService: class {} };
  if (request.endsWith('logger.service')) return { LoggerService: class {} };
  if (request === './command.module') return { CommandModule: class {} };
  return originalLoad.call(this, request, parent, isMain);
};
const command = new Module(${JSON.stringify(commandPath)});
command._compile(${JSON.stringify(compiledCommand)}, ${JSON.stringify(commandPath)});
`,
    ],
    {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, COMMAND_LIFECYCLE_TEST_MODE: mode },
    },
  );

describe('command process lifecycle', () => {
  it('exits successfully after cleanup even with a retained library handle', () => {
    const result = runCommandProcess('success');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Application context closed');
  });

  it('closes the application and preserves a handled command failure', () => {
    const result = runCommandProcess('handled-failure');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Application context closed');
    expect(result.stderr).toContain('command failed');
  });

  it('closes the application when command execution rejects', () => {
    const result = runCommandProcess('command-rejects');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('cleanup called');
    expect(result.stderr).toContain('command rejected');
  });

  it('reports cleanup failures and exits unsuccessfully', () => {
    const result = runCommandProcess('cleanup-rejects');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cleanup rejected');
  });

  it('fails rather than hanging indefinitely in a cleanup hook', () => {
    const result = runCommandProcess('cleanup-stalls');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Application context cleanup exceeded');
  });

  it('does not apply the cleanup deadline to running commands', () => {
    const result = runCommandProcess('slow-command');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('command completed');
    expect(result.stdout).toContain('Application context closed');
  });

  it('preserves the native interrupted exit status', () => {
    expect(runCommandProcess('interrupted').status).toBe(143);
  });

  it('drains buffered command output before exiting', () => {
    const result = runCommandProcess('large-output');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('x'.repeat(512 * 1024));
    expect(result.stdout).toContain('Application context closed');
  });

  it('reports initialization errors before application providers exist', () => {
    const result = runCommandProcess('initialization-fails');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('initialization failed');
    expect(result.stderr).not.toContain('before initialization');
  });
});
