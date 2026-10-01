import { type TemplateDescriptor } from './templateDescriptorType';
import {
  type TemplateApplyApplied,
  type TemplateApplyCreatedRecord,
  type TemplateApplyErrorCode,
  type TemplateApplyInstalledApplications,
  type TemplateApplyRejected,
  type TemplateApplyRequestRejection,
  type TemplateApplyResult,
} from './templateApplyType';

// Guards and the pure request validator for the C1 apply contract. The guards
// are structural (not `instanceof`) because a result crosses the logic-function
// boundary as plain JSON; the validator is shared so every content app refuses
// a request for the same reasons, with the same typed error codes.

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTemplateApplyCreatedRecord = (
  value: unknown,
): value is TemplateApplyCreatedRecord => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return isNonEmptyString(record.object) && isNonEmptyString(record.id);
};

const isTemplateApplyErrorCode = (
  value: unknown,
): value is TemplateApplyErrorCode =>
  value === 'UNKNOWN_TEMPLATE_KEY' ||
  value === 'MISSING_REQUIRED_APP' ||
  value === 'MISSING_INPUT' ||
  value === 'APPLY_FAILED';

export const isTemplateApplyApplied = (
  value: unknown,
): value is TemplateApplyApplied => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const applied = value as Record<string, unknown>;

  return (
    applied.status === 'applied' &&
    isNonEmptyString(applied.key) &&
    typeof applied.version === 'number' &&
    (applied.operationId === null || isNonEmptyString(applied.operationId)) &&
    Array.isArray(applied.created) &&
    (applied.created as unknown[]).every(isTemplateApplyCreatedRecord)
  );
};

export const isTemplateApplyRejected = (
  value: unknown,
): value is TemplateApplyRejected => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const rejected = value as Record<string, unknown>;

  return (
    rejected.status === 'rejected' &&
    isNonEmptyString(rejected.key) &&
    isTemplateApplyErrorCode(rejected.errorCode) &&
    isNonEmptyString(rejected.message)
  );
};

export const isTemplateApplyResult = (
  value: unknown,
): value is TemplateApplyResult =>
  isTemplateApplyApplied(value) || isTemplateApplyRejected(value);

// An input is "provided" when it carries a meaningful value: a non-empty
// string, any number or boolean, a non-null object (including arrays). The
// gallery only marks an input required when the descriptor asks for a value the
// apply cannot infer, so a blank string is a missing answer, not an answer.
const isProvidedInputValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};

// Pure request validation shared by every app: an apply is refused BEFORE any
// write when a required app is not installed or a required input is missing.
// Returns null when the request may proceed.
export const resolveTemplateApplyRequestError = ({
  descriptor,
  installedApplications,
  inputs,
}: {
  descriptor: TemplateDescriptor;
  installedApplications: TemplateApplyInstalledApplications;
  inputs?: Record<string, unknown> | null;
}): TemplateApplyRequestRejection | null => {
  const installedNames = new Set(installedApplications.names);
  const installedUniversalIdentifiers = new Set(
    installedApplications.universalIdentifiers,
  );

  const missingApplication = descriptor.requiredApps.find(
    (requiredApplication) =>
      !installedNames.has(requiredApplication) &&
      !installedUniversalIdentifiers.has(requiredApplication),
  );

  if (missingApplication !== undefined) {
    return {
      errorCode: 'MISSING_REQUIRED_APP',
      message: `L’application requise « ${missingApplication} » n’est pas installée.`,
    };
  }

  const missingInput = descriptor.inputs.find(
    (input) => input.required && !isProvidedInputValue(inputs?.[input.key]),
  );

  if (missingInput !== undefined) {
    return {
      errorCode: 'MISSING_INPUT',
      message: `Le champ requis « ${missingInput.label.fr} » est manquant.`,
    };
  }

  return null;
};
