import { useIsDriveApplicationInstalled } from '@/drive/hooks/useIsDriveApplicationInstalled';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';
import { QUICK_CREATE_ICON_BY_COMMAND_ID } from '@/quick-create/constants/QuickCreateCommandIcons';
import { useIsA2eAccountingApplicationInstalled } from '@/quick-create/hooks/useIsA2eAccountingApplicationInstalled';
import { useIsA2eProjectsApplicationInstalled } from '@/quick-create/hooks/useIsA2eProjectsApplicationInstalled';
import { resolveAvailableQuickCreateCommandConfigs } from '@/quick-create/utils/quickCreateCommandConfigs';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { type IconComponent } from 'twenty-ui/icon';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

export type QuickCreateCommand = {
  commandId: QuickCreateCommandId;
  id: string;
  label: string;
  Icon: IconComponent;
  objectNameSingular: string;
  isFileUpload: boolean;
};

const getQuickCreateCommandLabel = (
  commandId: QuickCreateCommandId,
): string => {
  switch (commandId) {
    case QUICK_CREATE_COMMAND_IDS.page:
      return t`New page`;
    case QUICK_CREATE_COMMAND_IDS.task:
      return t`New task`;
    case QUICK_CREATE_COMMAND_IDS.project:
      return t`New project`;
    case QUICK_CREATE_COMMAND_IDS.event:
      return t`New event`;
    case QUICK_CREATE_COMMAND_IDS.invoice:
      return t`New invoice`;
    case QUICK_CREATE_COMMAND_IDS.expense:
      return t`New expense`;
    case QUICK_CREATE_COMMAND_IDS.fileUpload:
      return t`Upload a file`;
  }
};

// Resolves the install-gated "Create…" entries, then applies the same side-panel
// search filter the other host commands use. Gating is install-based (never an
// object-metadata probe) so a half-installed workspace cannot offer an entry
// whose object does not exist yet.
export const useQuickCreateCommands = () => {
  const sidePanelSearch = useAtomStateValue(sidePanelSearchState);
  const isDocumentsInstalled = useIsDocumentApplicationInstalled();
  const isProjectsInstalled = useIsA2eProjectsApplicationInstalled();
  const isAccountingInstalled = useIsA2eAccountingApplicationInstalled();
  const isDriveInstalled = useIsDriveApplicationInstalled();

  const availableConfigs = resolveAvailableQuickCreateCommandConfigs({
    isDocumentsInstalled,
    isProjectsInstalled,
    isAccountingInstalled,
    isDriveInstalled,
  });

  const normalizedSearch = normalizeSearchText(sidePanelSearch.trim());

  const quickCreateCommands: QuickCreateCommand[] = availableConfigs
    .map((config) => ({
      commandId: config.commandId,
      id: config.commandId,
      label: getQuickCreateCommandLabel(config.commandId),
      Icon: QUICK_CREATE_ICON_BY_COMMAND_ID[config.commandId],
      objectNameSingular: config.objectNameSingular,
      isFileUpload: config.isFileUpload,
    }))
    .filter((command) =>
      normalizeSearchText(command.label).includes(normalizedSearch),
    );

  return { quickCreateCommands };
};
