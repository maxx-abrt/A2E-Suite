// Installation steps must be observable.
//
// A post-install hook runs in a worker child process: a step that throws is
// invisible to the installer and to the UI. Running every step through this
// runner means one failure is recorded with its step name and never prevents
// the remaining steps, so the handler's summary always says exactly what was
// seeded and what failed.

export type InstallStepOutcome<TResult> = {
  step: string;
  status: 'OK' | 'FAILED';
  result?: TResult;
  error?: string;
};

export const runInstallStep = async <TResult>(
  step: string,
  run: () => Promise<TResult>,
  onStepError: (outcome: InstallStepOutcome<TResult>) => void = () => {},
): Promise<InstallStepOutcome<TResult>> => {
  try {
    return { step, status: 'OK', result: await run() };
  } catch (error) {
    const outcome: InstallStepOutcome<TResult> = {
      step,
      status: 'FAILED',
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    };

    console.error(`[bilan] Étape d'installation en échec — ${step}`, {
      error: outcome.error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    onStepError(outcome);

    return outcome;
  }
};
