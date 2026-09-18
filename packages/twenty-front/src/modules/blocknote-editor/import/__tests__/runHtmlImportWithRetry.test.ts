import { runHtmlImportWithRetry } from '@/blocknote-editor/import/utils/runHtmlImportWithRetry';

describe('runHtmlImportWithRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    const run = jest.fn().mockResolvedValue('ok');
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(runHtmlImportWithRetry({ run, sleep })).resolves.toBe('ok');

    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a flaky run then succeeds, backing off linearly', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce(42);
    const sleep = jest.fn().mockResolvedValue(undefined);
    const onRetry = jest.fn();

    await expect(
      runHtmlImportWithRetry({ run, sleep, retryDelayMs: 100, onRetry }),
    ).resolves.toBe(42);

    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, 1);
    expect(run).toHaveBeenNthCalledWith(2, 2);
    expect(sleep).toHaveBeenCalledWith(100);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('throws the last error after exhausting attempts', async () => {
    const run = jest.fn().mockRejectedValue(new Error('nope'));
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      runHtmlImportWithRetry({ run, sleep, maxAttempts: 3 }),
    ).rejects.toThrow('nope');

    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('always runs at least once even with a non-positive maxAttempts', async () => {
    const run = jest.fn().mockResolvedValue('ok');

    await expect(runHtmlImportWithRetry({ run, maxAttempts: 0 })).resolves.toBe(
      'ok',
    );
    expect(run).toHaveBeenCalledTimes(1);
  });
});
