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

// Split so `useCreateA2eLink` (which reads the a2eLink object metadata and would
// throw while a2e-links is absent) is only mounted when a pre-link will actually
// be written — the LinkToRecordButton outer/inner gate.
//
// The page command is the first surface to adopt the M13a create chooser
// (QuickCreateRecordCommandWithChooser): its blank path is the exact create the
// command performed before, so existing behaviour is unchanged when the chooser
// is dismissed with Blank.
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

  const handleClick = useCallback(() => {
    void createQuickCreateRecord();
  }, [createQuickCreateRecord]);

  if (withCreateChooser) {
    return (
      <QuickCreateRecordCommandWithChooser
        command={command}
        category="Pages"
        onBlank={handleClick}
      />
    );
  }

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
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

  const handleClick = useCallback(() => {
    void (async () => {
      const createdRecord = await createQuickCreateRecord();

      if (!isDefined(createdRecord)) {
        return;
      }

      await createA2eLink(
        buildQuickCreatePreLinkEndpoints({
          sourceObjectNameSingular: sourceRecord.objectNameSingular,
          sourceRecordId: sourceRecord.recordId,
          createdObjectNameSingular: command.objectNameSingular,
          createdRecordId: createdRecord.id,
        }),
      );
    })();
  }, [
    command.objectNameSingular,
    createA2eLink,
    createQuickCreateRecord,
    sourceRecord.objectNameSingular,
    sourceRecord.recordId,
  ]);

  if (withCreateChooser) {
    return (
      <QuickCreateRecordCommandWithChooser
        command={command}
        category="Pages"
        onBlank={handleClick}
      />
    );
  }

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
  );
};
