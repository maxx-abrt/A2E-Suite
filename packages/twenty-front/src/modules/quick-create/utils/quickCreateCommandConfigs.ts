import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';
import { QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID } from '@/quick-create/constants/QuickCreateObjectNameSingularByCommandId';

// Which install a create entry depends on. `host` is always available (the
// standard calendar object exists everywhere); every A2E app gate is an install
// check, never an object-metadata probe, because metadata can resolve while an
// install is still mid-flight (the M8e new-page precedent).
export type QuickCreateInstallGate =
  | 'host'
  | 'a2e-documents'
  | 'a2e-projects'
  | 'a2e-accounting'
  | 'a2e-drive';

export type QuickCreateInstalledApplications = {
  isDocumentsInstalled: boolean;
  isProjectsInstalled: boolean;
  isAccountingInstalled: boolean;
  isDriveInstalled: boolean;
};

export type QuickCreateCommandConfig = {
  commandId: QuickCreateCommandId;
  objectNameSingular: string;
  installGate: QuickCreateInstallGate;
  isFileUpload: boolean;
};

export const QUICK_CREATE_COMMAND_CONFIGS: QuickCreateCommandConfig[] = [
  {
    commandId: QUICK_CREATE_COMMAND_IDS.page,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.page
      ],
    installGate: 'a2e-documents',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.task,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.task
      ],
    installGate: 'a2e-projects',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.project,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.project
      ],
    installGate: 'a2e-projects',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.event,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.event
      ],
    installGate: 'host',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.invoice,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.invoice
      ],
    installGate: 'a2e-accounting',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.expense,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.expense
      ],
    installGate: 'a2e-accounting',
    isFileUpload: false,
  },
  {
    commandId: QUICK_CREATE_COMMAND_IDS.fileUpload,
    objectNameSingular:
      QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID[
        QUICK_CREATE_COMMAND_IDS.fileUpload
      ],
    installGate: 'a2e-drive',
    isFileUpload: true,
  },
];

export const isQuickCreateCommandAvailable = ({
  installGate,
  installedApplications,
}: {
  installGate: QuickCreateInstallGate;
  installedApplications: QuickCreateInstalledApplications;
}): boolean => {
  switch (installGate) {
    case 'host':
      return true;
    case 'a2e-documents':
      return installedApplications.isDocumentsInstalled;
    case 'a2e-projects':
      return installedApplications.isProjectsInstalled;
    case 'a2e-accounting':
      return installedApplications.isAccountingInstalled;
    case 'a2e-drive':
      return installedApplications.isDriveInstalled;
  }
};

export const resolveAvailableQuickCreateCommandConfigs = (
  installedApplications: QuickCreateInstalledApplications,
): QuickCreateCommandConfig[] =>
  QUICK_CREATE_COMMAND_CONFIGS.filter((config) =>
    isQuickCreateCommandAvailable({
      installGate: config.installGate,
      installedApplications,
    }),
  );
