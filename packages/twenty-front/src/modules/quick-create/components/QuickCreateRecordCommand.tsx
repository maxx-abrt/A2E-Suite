import { useCreateA2eLink } from '@/a2e-links/hooks/useCreateA2eLink';
import { useIsA2eLinksApplicationInstalled } from '@/a2e-links/hooks/useIsA2eLinksApplicationInstalled';
import { QuickCreateRecordCommandItem } from '@/quick-create/components/QuickCreateRecordCommandItem';
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
};

type QuickCreateRecordCommandWithoutPreLinkProps = {
  command: QuickCreateCommand;
};

// Split so `useCreateA2eLink` (which reads the a2eLink object metadata and would
// throw while a2e-links is absent) is only mounted when a pre-link will actually
// be written — the LinkToRecordButton outer/inner gate.
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

  if (shouldPreLink && isDefined(sourceRecord)) {
    return (
      <QuickCreateRecordCommandWithPreLink
        command={command}
        sourceRecord={sourceRecord}
      />
    );
  }

  return <QuickCreateRecordCommandWithoutPreLink command={command} />;
};

const QuickCreateRecordCommandWithoutPreLink = ({
  command,
}: QuickCreateRecordCommandWithoutPreLinkProps) => {
  const { createQuickCreateRecord } = useQuickCreateRecordCreate({
    commandId: command.commandId,
    objectNameSingular: command.objectNameSingular,
  });

  const handleClick = useCallback(() => {
    void createQuickCreateRecord();
  }, [createQuickCreateRecord]);

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
  );
};

const QuickCreateRecordCommandWithPreLink = ({
  command,
  sourceRecord,
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

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
  );
};
