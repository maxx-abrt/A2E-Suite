import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ApplicationInstallReadinessDTO } from 'src/engine/core-modules/application/application-install/dtos/application-install-readiness.dto';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';

@Injectable()
export class ApplicationInstallReadinessService {
  constructor(
    private readonly applicationRegistrationService: ApplicationRegistrationService,
    private readonly applicationVersionValidationService: ApplicationVersionValidationService,
    private readonly applicationService: ApplicationService,
  ) {}

  // Reuses the registration and workspace-compatibility sources the install
  // path itself uses, so readiness cannot claim ready for an install that would
  // be refused, and cannot duplicate the template-preview contract.
  async getInstallReadiness({
    workspaceId,
    universalIdentifiers,
  }: {
    workspaceId: string;
    universalIdentifiers: string[];
  }): Promise<ApplicationInstallReadinessDTO[]> {
    const readiness: ApplicationInstallReadinessDTO[] = [];

    for (const universalIdentifier of universalIdentifiers) {
      const registration =
        await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
          universalIdentifier,
        );

      const currentlyInstalled = isDefined(
        await this.applicationService.findByUniversalIdentifier({
          universalIdentifier,
          workspaceId,
        }),
      );

      let versionCompatible = false;

      if (isDefined(registration)) {
        const versionValidation =
          await this.applicationVersionValidationService.validateWorkspaceCompatibility(
            {
              requiredServerVersion:
                registration.manifest?.application
                  ?.requiredServerVersionRange ?? undefined,
              workspaceId,
            },
          );

        versionCompatible = versionValidation.compatible;
      }

      const ready = isDefined(registration) && versionCompatible;

      readiness.push({
        universalIdentifier,
        registered: isDefined(registration),
        versionCompatible,
        currentlyInstalled,
        ready,
        blockedReason: ready
          ? null
          : isDefined(registration)
            ? 'VERSION_INCOMPATIBLE'
            : 'APP_NOT_REGISTERED',
      });
    }

    return readiness;
  }
}
