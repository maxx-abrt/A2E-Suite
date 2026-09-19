import {
  type ApplyTemplateResult,
  type ApplyTemplateStep,
} from '@/a2e-workspace/types/apply-template-operation.types';
import { getApplyTemplateResultOutcome } from '@/a2e-workspace/utils/getApplyTemplateResultOutcome';

const buildStep = (
  overrides: Partial<ApplyTemplateStep> = {},
): ApplyTemplateStep => ({
  kind: 'INSTALL_APP',
  targetUniversalIdentifier: 'app-documents',
  status: 'SUCCEEDED',
  ...overrides,
});

const buildResult = (
  overrides: Partial<ApplyTemplateResult> = {},
): ApplyTemplateResult => ({
  operationId: 'op-1',
  requestedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
  appliedTemplateKeyVersion: { key: 'INDIVIDUAL', version: 1 },
  steps: [
    buildStep(),
    buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SUCCEEDED' }),
  ],
  ...overrides,
});

describe('getApplyTemplateResultOutcome', () => {
  it('reports applied when the template row was set and no step failed', () => {
    expect(getApplyTemplateResultOutcome(buildResult())).toBe('applied');
  });

  it('treats a skipped optional step as applied', () => {
    expect(
      getApplyTemplateResultOutcome(
        buildResult({
          steps: [
            buildStep({ status: 'SUCCEEDED' }),
            buildStep({ kind: 'SEED_SAMPLES', status: 'SKIPPED' }),
            buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SUCCEEDED' }),
          ],
        }),
      ),
    ).toBe('applied');
  });

  it('reports partial when some steps succeeded and one failed', () => {
    expect(
      getApplyTemplateResultOutcome(
        buildResult({
          appliedTemplateKeyVersion: null,
          steps: [
            buildStep({ status: 'SUCCEEDED' }),
            buildStep({
              status: 'FAILED',
              errorCode: 'INSTALL_FAILED',
              localizedMessage: 'install boom',
            }),
          ],
        }),
      ),
    ).toBe('partial');
  });

  it('never reports applied when a failed step sits beside a set template', () => {
    expect(
      getApplyTemplateResultOutcome(
        buildResult({
          steps: [
            buildStep({ status: 'SUCCEEDED' }),
            buildStep({
              kind: 'SEED_SAMPLES',
              status: 'FAILED',
              errorCode: 'SEED_FAILED',
            }),
            buildStep({ kind: 'SET_WORKSPACE_TEMPLATE', status: 'SUCCEEDED' }),
          ],
        }),
      ),
    ).toBe('partial');
  });

  it('never reports applied while a step is still pending or running', () => {
    expect(
      getApplyTemplateResultOutcome(
        buildResult({
          steps: [
            buildStep({ status: 'SUCCEEDED' }),
            buildStep({ status: 'PENDING' }),
            buildStep({ status: 'RUNNING' }),
          ],
        }),
      ),
    ).toBe('partial');
  });

  it('reports failed when no step succeeded', () => {
    expect(
      getApplyTemplateResultOutcome(
        buildResult({
          appliedTemplateKeyVersion: null,
          steps: [
            buildStep({ status: 'FAILED', errorCode: 'APP_NOT_REGISTERED' }),
          ],
        }),
      ),
    ).toBe('failed');
  });
});
