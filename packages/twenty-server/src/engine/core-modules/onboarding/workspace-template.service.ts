import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';

import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { type Repository } from 'typeorm';

import { ApplicationInstallService } from 'src/engine/core-modules/application/application-install/application-install.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import {
  OnboardingException,
  OnboardingExceptionCode,
} from 'src/engine/core-modules/onboarding/onboarding.exception';
import { getWorkspaceTemplateDefinition } from 'src/engine/core-modules/onboarding/utils/get-workspace-template-definition.util';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_NAVIGATION_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { createStandardNavigationMenuItemFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-flat-metadata.util';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { NavigationMenuItemType } from 'twenty-shared/types';

export class WorkspaceTemplateService {
  private readonly logger = new Logger(WorkspaceTemplateService.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly applicationRegistrationService: ApplicationRegistrationService,
    private readonly applicationInstallService: ApplicationInstallService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {}

  async applyWorkspaceTemplate({
    workspaceId,
    template,
  }: {
    workspaceId: string;
    template: WorkspaceTemplate;
  }): Promise<void> {
    const definition = getWorkspaceTemplateDefinition(template);

    for (const applicationUniversalIdentifier of definition.applicationUniversalIdentifiers) {
      await this.installTemplateApplication({
        workspaceId,
        applicationUniversalIdentifier,
      });
    }

    if (
      isNonEmptyArray(
        definition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
      )
    ) {
      try {
        await this.applyTemplateNavigationVisibility({
          workspaceId,
          hiddenUniversalIdentifiers:
            definition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
        });
      } catch (error) {
        this.logger.error(
          `Failed to apply template navigation visibility for workspace ${workspaceId}`,
          error,
        );

        throw new OnboardingException(
          `Failed to apply template navigation visibility for workspace ${workspaceId}`,
          OnboardingExceptionCode.TEMPLATE_APPLICATION_FAILED,
        );
      }
    }

    // sample content seeding lands with P3 when a2e-documents has objects;
    // the flag is part of the preset data contract from day one.
    if (definition.sampleContentEnabled) {
      this.logger.warn(
        `Sample content requested by template ${template} for workspace ${workspaceId} but no seeder exists yet`,
      );
    }

    await this.workspaceRepository.update(
      { id: workspaceId },
      { workspaceTemplate: template },
    );
  }

  private async installTemplateApplication({
    workspaceId,
    applicationUniversalIdentifier,
  }: {
    workspaceId: string;
    applicationUniversalIdentifier: string;
  }): Promise<void> {
    try {
      const registration =
        await this.applicationRegistrationService.findOneByUniversalIdentifierGlobal(
          applicationUniversalIdentifier,
        );

      if (!isDefined(registration)) {
        this.logger.warn(
          `Template app ${applicationUniversalIdentifier} is not registered on this server, skipping install for workspace ${workspaceId}`,
        );

        return;
      }

      await this.applicationInstallService.installApplication({
        appRegistrationId: registration.id,
        workspaceId,
      });
    } catch (error) {
      // App installs are additive; a single failure must not block the rest
      // of the preset (mirrors InstallOnboardingAppsJob error handling).
      this.logger.error(
        `Failed to install template app ${applicationUniversalIdentifier} for workspace ${workspaceId}`,
        error,
      );
    }
  }

  private async applyTemplateNavigationVisibility({
    workspaceId,
    hiddenUniversalIdentifiers,
  }: {
    workspaceId: string;
    hiddenUniversalIdentifiers: string[];
  }): Promise<void> {
    const { flatNavigationMenuItemMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
      ]);

    const existingItemsByUniversalIdentifier = new Map(
      Object.values(flatNavigationMenuItemMaps.byUniversalIdentifier)
        .filter(isDefined)
        .map((navigationMenuItem) => [
          navigationMenuItem.universalIdentifier,
          navigationMenuItem,
        ]),
    );

    const hiddenUniversalIdentifierSet = new Set(hiddenUniversalIdentifiers);

    const navigationMenuItemsToDelete = [
      ...existingItemsByUniversalIdentifier.values(),
    ].filter((navigationMenuItem) =>
      hiddenUniversalIdentifierSet.has(navigationMenuItem.universalIdentifier),
    );

    const universalIdentifiersToRestore =
      TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.filter(
        (universalIdentifier) =>
          !hiddenUniversalIdentifierSet.has(universalIdentifier) &&
          !existingItemsByUniversalIdentifier.has(universalIdentifier),
      );

    if (
      navigationMenuItemsToDelete.length === 0 &&
      universalIdentifiersToRestore.length === 0
    ) {
      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const navigationMenuItemsToCreate =
      await this.buildStandardNavigationMenuItemsToRestore({
        workspaceId,
        universalIdentifiersToRestore,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    if (
      navigationMenuItemsToDelete.length === 0 &&
      navigationMenuItemsToCreate.length === 0
    ) {
      return;
    }

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: navigationMenuItemsToCreate,
              flatEntityToDelete: navigationMenuItemsToDelete,
              flatEntityToUpdate: [],
            },
          },
        },
      );

    if (result.status === 'fail') {
      throw new Error(
        `Template navigation migration failed for workspace ${workspaceId}: ${JSON.stringify(result, null, 2)}`,
      );
    }
  }

  private async buildStandardNavigationMenuItemsToRestore({
    workspaceId,
    universalIdentifiersToRestore,
    twentyStandardApplicationId,
  }: {
    workspaceId: string;
    universalIdentifiersToRestore: string[];
    twentyStandardApplicationId: string;
  }) {
    if (universalIdentifiersToRestore.length === 0) {
      return [];
    }

    const { flatViewMaps } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['flatViewMaps'],
    );

    const now = new Date().toISOString();
    const navigationMenuItemNames = Object.keys(
      STANDARD_NAVIGATION_MENU_ITEMS,
    ) as (keyof typeof STANDARD_NAVIGATION_MENU_ITEMS)[];

    const navigationMenuItemsToCreate = [];

    for (const universalIdentifier of universalIdentifiersToRestore) {
      const navigationMenuItemName = navigationMenuItemNames.find(
        (name) =>
          STANDARD_NAVIGATION_MENU_ITEMS[name].universalIdentifier ===
          universalIdentifier,
      );

      if (!isDefined(navigationMenuItemName)) {
        this.logger.warn(
          `No standard definition for navigation menu item ${universalIdentifier}, skipping restore`,
        );

        continue;
      }
      const definition = STANDARD_NAVIGATION_MENU_ITEMS[navigationMenuItemName];

      if (definition.type !== NavigationMenuItemType.OBJECT) {
        this.logger.warn(
          `Standard navigation menu item ${universalIdentifier} is not an OBJECT row, skipping restore`,
        );

        continue;
      }

      const objectDefinition =
        definition as (typeof STANDARD_NAVIGATION_MENU_ITEMS)[typeof navigationMenuItemName] & {
          viewUniversalIdentifier: string;
        };

      try {
        navigationMenuItemsToCreate.push(
          createStandardNavigationMenuItemFlatMetadata({
            workspaceId,
            navigationMenuItemName,
            viewUniversalIdentifier: objectDefinition.viewUniversalIdentifier,
            position: definition.position,
            navigationMenuItemId: randomUUID(),
            dependencyFlatEntityMaps: { flatViewMaps },
            twentyStandardApplicationId,
            now,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Failed to build standard navigation menu item ${universalIdentifier} for workspace ${workspaceId}, skipping restore`,
          error,
        );
      }
    }

    return navigationMenuItemsToCreate;
  }
}
