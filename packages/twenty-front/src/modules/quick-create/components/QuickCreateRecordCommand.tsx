import { useCreateA2eLink } from '@/a2e-links/hooks/useCreateA2eLink';
import { useIsA2eLinksApplicationInstalled } from '@/a2e-links/hooks/useIsA2eLinksApplicationInstalled';
import { QuickCreateRecordCommandItem } from '@/quick-create/components/QuickCreateRecordCommandItem';
import { QuickCreateRecordCommandWithChooser } from '@/quick-create/components/QuickCreateRecordCommandWithChooser';
import { QUICK_CREATE_COMMAND_IDS } from '@/quick-create/constants/QuickCreateCommandIds';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { useQuickCreateRecordCreate } from '@/quick-create/hooks/useQuickCreateRecordCreate';
import {
  buildQuickCreatePreLinkEndpoints,
  shouldPreLinkQuickCreate,
} from '@/quick-create/utils/buildQuickCreatePreLinkEndpoints';
import { type QuickCreateSourceRecord } from '@/quick-create/utils/resolveQuickCreateSourceRecord';
import { useCallback } from 'react';
import { QuickCreateWorkRecordCommandItem } from '@/quick-create/components/QuickCreateWorkRecordCommandItem';
import { isDefined } from 'twenty-shared/utils';

type QuickCreateRecordCommandProps = {
  command: QuickCreateCommand;
  sourceRecord: QuickCreateSourceRecord | null;
};

type QuickCreateRecordCommandWithPreLinkProps = {
  command: QuickCreateCommand;
  sourceRecord: QuickCreateSourceRecord;
  withCreateChooser: boolean;
};

type QuickCreateRecordCommandWithoutPreLinkProps = {
  command: QuickCreateCommand;
  withCreateChooser: boolean;
};

// The link hook requires installed junction metadata, so only the linked branch
// mounts it. Both branches share the same title-first task/project entry.
export const QuickCreateRecordCommand = ({
  command,
  sourceRecord,
}: QuickCreateRecordCommandProps) => {
  const isA2eLinksApplicationInstalled = useIsA2eLinksApplicationInstalled();

  const shouldPreLink =
    isDefined(sourceRecord) &&
    shouldPreLinkQuickCreate({
      isA2eLinksApplicationInstalled,
      sourceObjectNameSingular: sourceRecord.objectNameSingular,
      createdObjectNameSingular: command.objectNameSingular,
    });

  const withCreateChooser = command.commandId === QUICK_CREATE_COMMAND_IDS.page;

  if (shouldPreLink && isDefined(sourceRecord)) {
    return (
      <QuickCreateRecordCommandWithPreLink
        command={command}
        sourceRecord={sourceRecord}
        withCreateChooser={withCreateChooser}
      />
    );
  }

  return (
    <QuickCreateRecordCommandWithoutPreLink
      command={command}
      withCreateChooser={withCreateChooser}
    />
  );
};

const QuickCreateRecordCommandWithoutPreLink = ({
  command,
  withCreateChooser,
}: QuickCreateRecordCommandWithoutPreLinkProps) => {
  const { createQuickCreateRecord } = useQuickCreateRecordCreate({
    commandId: command.commandId,
    objectNameSingular: command.objectNameSingular,
  });

  const handleCreate = useCallback(
    async (title?: string) => {
      await createQuickCreateRecord(title);
    },
    [createQuickCreateRecord],
  );

  return (
    <QuickCreateRecordCommandAction
      command={command}
      withCreateChooser={withCreateChooser}
      onCreate={handleCreate}
    />
  );
};

const QuickCreateRecordCommandWithPreLink = ({
  command,
  sourceRecord,
  withCreateChooser,
}: QuickCreateRecordCommandWithPreLinkProps) => {
  const { createQuickCreateRecord } = useQuickCreateRecordCreate({
    commandId: command.commandId,
    objectNameSingular: command.objectNameSingular,
  });
  const { createA2eLink } = useCreateA2eLink();

  const handleCreate = useCallback(
    async (title?: string) => {
      const createdRecord = await createQuickCreateRecord(title);

      if (!isDefined(createdRecord)) return;

      await createA2eLink(
        buildQuickCreatePreLinkEndpoints({
          sourceObjectNameSingular: sourceRecord.objectNameSingular,
          sourceRecordId: sourceRecord.recordId,
          createdObjectNameSingular: command.objectNameSingular,
          createdRecordId: createdRecord.id,
        }),
      );
    },
    [
      command.objectNameSingular,
      createA2eLink,
      createQuickCreateRecord,
      sourceRecord.objectNameSingular,
      sourceRecord.recordId,
    ],
  );

  return (
    <QuickCreateRecordCommandAction
      command={command}
      withCreateChooser={withCreateChooser}
      onCreate={handleCreate}
    />
  );
};

type QuickCreateRecordCommandActionProps = {
  command: QuickCreateCommand;
  withCreateChooser: boolean;
  onCreate: (title?: string) => Promise<void>;
};

const QuickCreateRecordCommandAction = ({
  command,
  withCreateChooser,
  onCreate,
}: QuickCreateRecordCommandActionProps) => {
  const handleClick = () => {
    void onCreate();
  };

  if (withCreateChooser) {
    return (
      <QuickCreateRecordCommandWithChooser
        command={command}
        category="Pages"
        onBlank={handleClick}
      />
    );
  }

  if (
    command.objectNameSingular === 'task' ||
    command.objectNameSingular === 'project'
  ) {
    return (
      <QuickCreateWorkRecordCommandItem command={command} onCreate={onCreate} />
    );
  }

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
  );
};
