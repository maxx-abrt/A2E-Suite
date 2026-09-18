export type RunHtmlImportWithRetryOptions<Result> = {
  run: (attempt: number) => Promise<Result>;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: (durationMs: number) => Promise<void>;
  onRetry?: (attempt: number, error: unknown) => void;
};

const defaultSleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

// Retries a flaky import step (parsing) with linear backoff. `sleep` is
// injectable so tests stay deterministic and never touch real timers.
export const runHtmlImportWithRetry = async <Result>(
  options: RunHtmlImportWithRetryOptions<Result>,
): Promise<Result> => {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryDelayMs = options.retryDelayMs ?? 250;
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await options.run(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      options.onRetry?.(attempt, error);
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError;
};
