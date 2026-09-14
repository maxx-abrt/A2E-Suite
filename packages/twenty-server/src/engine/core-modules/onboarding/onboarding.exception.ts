import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { CustomException } from 'src/utils/custom-exception';

export enum OnboardingExceptionCode {
  NO_PREVIOUS_ONBOARDING_STEP = 'NO_PREVIOUS_ONBOARDING_STEP',
  MISSING_TRANSACTION_QUERY_RUNNER = 'MISSING_TRANSACTION_QUERY_RUNNER',
  INSTALL_APPS_JOB_ENQUEUE_FAILED = 'INSTALL_APPS_JOB_ENQUEUE_FAILED',
  TEMPLATE_APPLICATION_FAILED = 'TEMPLATE_APPLICATION_FAILED',
  TEMPLATE_UNKNOWN = 'TEMPLATE_UNKNOWN',
  TEMPLATE_VERSION_CONFLICT = 'TEMPLATE_VERSION_CONFLICT',
  TEMPLATE_APP_NOT_IN_DEFINITION = 'TEMPLATE_APP_NOT_IN_DEFINITION',
  TEMPLATE_REQUIRED_APP_DESELECTED = 'TEMPLATE_REQUIRED_APP_DESELECTED',
  TEMPLATE_BLOCKED = 'TEMPLATE_BLOCKED',
  TEMPLATE_IDEMPOTENCY_CONFLICT = 'TEMPLATE_IDEMPOTENCY_CONFLICT',
}

const getOnboardingExceptionUserFriendlyMessage = (
  code: OnboardingExceptionCode,
) => {
  switch (code) {
    case OnboardingExceptionCode.NO_PREVIOUS_ONBOARDING_STEP:
      return msg`There is no previous onboarding step to go back to.`;
    case OnboardingExceptionCode.MISSING_TRANSACTION_QUERY_RUNNER:
      return msg`Something went wrong while saving your onboarding progress.`;
    case OnboardingExceptionCode.INSTALL_APPS_JOB_ENQUEUE_FAILED:
      return msg`Something went wrong while starting the app installation. Please try again.`;
    case OnboardingExceptionCode.TEMPLATE_APPLICATION_FAILED:
      return msg`Something went wrong while applying the workspace template. Please try again.`;
    case OnboardingExceptionCode.TEMPLATE_UNKNOWN:
      return msg`This workspace template does not exist.`;
    case OnboardingExceptionCode.TEMPLATE_VERSION_CONFLICT:
      return msg`The workspace template changed since you previewed it. Please refresh the preview and try again.`;
    case OnboardingExceptionCode.TEMPLATE_APP_NOT_IN_DEFINITION:
      return msg`One of the selected apps does not belong to this workspace template.`;
    case OnboardingExceptionCode.TEMPLATE_REQUIRED_APP_DESELECTED:
      return msg`A required app cannot be excluded from this workspace template.`;
    case OnboardingExceptionCode.TEMPLATE_BLOCKED:
      return msg`This workspace template cannot be applied right now because a required app is unavailable. Please review the preview.`;
    case OnboardingExceptionCode.TEMPLATE_IDEMPOTENCY_CONFLICT:
      return msg`This setup key was already used with a different configuration. Please start a new setup.`;
    default:
      assertUnreachable(code);
  }
};

export class OnboardingException extends CustomException<OnboardingExceptionCode> {
  constructor(
    message: string,
    code: OnboardingExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getOnboardingExceptionUserFriendlyMessage(code),
    });
  }
}
