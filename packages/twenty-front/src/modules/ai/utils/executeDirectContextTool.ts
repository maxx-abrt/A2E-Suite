import { t } from '@lingui/core/macro';

import { type BrowsingContext } from '@/ai/types/BrowsingContext';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import {
  type DirectToolDispatch,
  type DirectToolExecutionOutcome,
  type DirectToolRefusalReason,
} from '@/ai/types/DirectToolInvocation';
import { buildDirectToolInvocation } from '@/ai/utils/buildDirectToolInvocation';

export const getDirectToolRefusalMessage = (
  reason: DirectToolRefusalReason,
): string => {
  switch (reason) {
    case 'MUTATING_TOOL_NOT_DIRECTLY_EXECUTABLE':
      return t`This action can change your data, so it cannot run directly. Confirm it in the assistant first.`;
    case 'NO_BROWSING_CONTEXT':
      return t`This action needs an open record or channel to run.`;
    case 'MISSING_REQUIRED_INPUT':
      return t`This action needs a target from the current page, which is not available here.`;
  }
};

// A direct execution is: build the read-only invocation from the browsing
// context, hand it to the dispatch seam, and report the outcome. A refusal is
// decided before any dispatch; a dispatch that rejects or reports failure is
// surfaced as a failed outcome (never thrown) so the thread shows the app's
// fail-closed error instead of crashing or presenting a partial success.
export const executeDirectContextTool = async ({
  contextToolButton,
  browsingContext,
  dispatch,
}: {
  contextToolButton: ContextToolButton;
  browsingContext: BrowsingContext | null;
  dispatch: DirectToolDispatch;
}): Promise<DirectToolExecutionOutcome> => {
  const buildResult = buildDirectToolInvocation({
    contextToolButton,
    browsingContext,
  });

  if (buildResult.kind === 'refused') {
    return {
      status: 'refused',
      reason: buildResult.reason,
      message: getDirectToolRefusalMessage(buildResult.reason),
    };
  }

  try {
    const dispatchResult = await dispatch(buildResult.invocation);

    return dispatchResult.success
      ? { status: 'executed', result: dispatchResult.result }
      : { status: 'failed', message: dispatchResult.error };
  } catch (error) {
    return {
      status: 'failed',
      message:
        error instanceof Error
          ? error.message
          : t`The action could not be completed.`,
    };
  }
};
