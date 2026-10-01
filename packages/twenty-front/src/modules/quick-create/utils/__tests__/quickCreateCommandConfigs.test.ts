import { QUICK_CREATE_COMMAND_IDS } from '@/quick-create/constants/QuickCreateCommandIds';
import {
  QUICK_CREATE_COMMAND_CONFIGS,
  resolveAvailableQuickCreateCommandConfigs,
} from '@/quick-create/utils/quickCreateCommandConfigs';

const noAppInstalled = {
  isDocumentsInstalled: false,
  isProjectsInstalled: false,
  isAccountingInstalled: false,
  isDriveInstalled: false,
};

const everyAppInstalled = {
  isDocumentsInstalled: true,
  isProjectsInstalled: true,
  isAccountingInstalled: true,
  isDriveInstalled: true,
};

describe('quickCreateCommandConfigs', () => {
  it('declares every "Create…" entry from the PLAN M11c list', () => {
    expect(
      QUICK_CREATE_COMMAND_CONFIGS.map((config) => config.commandId),
    ).toEqual([
      QUICK_CREATE_COMMAND_IDS.page,
      QUICK_CREATE_COMMAND_IDS.task,
      QUICK_CREATE_COMMAND_IDS.project,
      QUICK_CREATE_COMMAND_IDS.event,
      QUICK_CREATE_COMMAND_IDS.invoice,
      QUICK_CREATE_COMMAND_IDS.expense,
      QUICK_CREATE_COMMAND_IDS.fileUpload,
    ]);
  });

  it('maps each entry to the existing create primitive object', () => {
    const objectNameSingularByCommandId = Object.fromEntries(
      QUICK_CREATE_COMMAND_CONFIGS.map((config) => [
        config.commandId,
        config.objectNameSingular,
      ]),
    );

    expect(objectNameSingularByCommandId).toEqual({
      [QUICK_CREATE_COMMAND_IDS.page]: 'document',
      [QUICK_CREATE_COMMAND_IDS.task]: 'task',
      [QUICK_CREATE_COMMAND_IDS.project]: 'project',
      [QUICK_CREATE_COMMAND_IDS.event]: 'calendarEvent',
      [QUICK_CREATE_COMMAND_IDS.invoice]: 'invoice',
      [QUICK_CREATE_COMMAND_IDS.expense]: 'financeEntry',
      [QUICK_CREATE_COMMAND_IDS.fileUpload]: 'attachment',
    });
  });

  it('shows only the host entry when no app is installed', () => {
    expect(
      resolveAvailableQuickCreateCommandConfigs(noAppInstalled).map(
        (config) => config.commandId,
      ),
    ).toEqual([QUICK_CREATE_COMMAND_IDS.event]);
  });

  it('gates each app entry on its owning app install', () => {
    expect(
      resolveAvailableQuickCreateCommandConfigs({
        ...noAppInstalled,
        isDocumentsInstalled: true,
      }).map((config) => config.commandId),
    ).toEqual([QUICK_CREATE_COMMAND_IDS.page, QUICK_CREATE_COMMAND_IDS.event]);

    expect(
      resolveAvailableQuickCreateCommandConfigs({
        ...noAppInstalled,
        isProjectsInstalled: true,
      }).map((config) => config.commandId),
    ).toEqual([
      QUICK_CREATE_COMMAND_IDS.task,
      QUICK_CREATE_COMMAND_IDS.project,
      QUICK_CREATE_COMMAND_IDS.event,
    ]);

    expect(
      resolveAvailableQuickCreateCommandConfigs({
        ...noAppInstalled,
        isAccountingInstalled: true,
      }).map((config) => config.commandId),
    ).toEqual([
      QUICK_CREATE_COMMAND_IDS.event,
      QUICK_CREATE_COMMAND_IDS.invoice,
      QUICK_CREATE_COMMAND_IDS.expense,
    ]);

    expect(
      resolveAvailableQuickCreateCommandConfigs({
        ...noAppInstalled,
        isDriveInstalled: true,
      }).map((config) => config.commandId),
    ).toEqual([
      QUICK_CREATE_COMMAND_IDS.event,
      QUICK_CREATE_COMMAND_IDS.fileUpload,
    ]);
  });

  it('shows all seven entries when every app is installed', () => {
    expect(
      resolveAvailableQuickCreateCommandConfigs(everyAppInstalled),
    ).toHaveLength(7);
  });
});
