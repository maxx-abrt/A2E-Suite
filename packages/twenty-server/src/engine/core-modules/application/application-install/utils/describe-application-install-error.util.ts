import { isDefined } from 'twenty-shared/utils';

import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';

const MAX_REPORTED_VALIDATION_ERRORS = 10;

// A failed manifest sync only says "Validation errors occurred"; without the
// per-entity reasons an operator cannot tell a missing dependency app from a
// broken manifest, so the log line carries a bounded digest of them.
export const describeApplicationInstallError = (error: unknown): string => {
  if (!(error instanceof WorkspaceMigrationBuilderException)) {
    return String(error);
  }

  const report = error.failedWorkspaceMigrationBuildResult?.report;

  if (!isDefined(report)) {
    return String(error);
  }

  const details: string[] = [];

  for (const [metadataName, failedValidations] of Object.entries(report)) {
    for (const failedValidation of failedValidations ?? []) {
      const entityName =
        (
          failedValidation.flatEntityMinimalInformation as {
            name?: string;
            universalIdentifier?: string;
          }
        )?.name ??
        (
          failedValidation.flatEntityMinimalInformation as {
            universalIdentifier?: string;
          }
        )?.universalIdentifier ??
        'unknown';

      for (const validationError of failedValidation.errors) {
        details.push(
          `${metadataName}:${failedValidation.type} "${entityName}" ${validationError.code}: ${validationError.message}`,
        );
      }
    }
  }

  if (details.length === 0) {
    return String(error);
  }

  const reportedDetails = details.slice(0, MAX_REPORTED_VALIDATION_ERRORS);
  const omittedCount = details.length - reportedDetails.length;

  return `${error.message} — ${reportedDetails.join(' | ')}${
    omittedCount > 0 ? ` (+${omittedCount} more)` : ''
  }`;
};
