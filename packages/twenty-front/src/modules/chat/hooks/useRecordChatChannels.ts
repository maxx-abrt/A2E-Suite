import { useCallback } from 'react';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type RecordGqlOperationFilter } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import {
  buildRecordChatChannelInput,
  findRecordChatChannel,
  getRecordChatChannelRelationFilter,
  type RecordChatChannel,
} from '@/chat/utils/recordChatChannel';

const RECORD_CHAT_CHANNELS_LIMIT = 50;

const RECORD_CHAT_CHANNEL_GQL_FIELDS = {
  id: true,
  name: true,
  kind: true,
  visibility: true,
  topic: true,
  projectId: true,
  companyId: true,
};

// Reads the discussion channel(s) attached to one record through the a2e-chat
// channel relation. Returns the first channel for the record plus a provision
// action that creates one when the record has none yet.
export const useRecordChatChannels = ({
  objectNameSingular,
  recordId,
}: {
  objectNameSingular: string;
  recordId: string | null;
}) => {
  const relationFilter =
    isDefined(recordId) && isDefined(objectNameSingular)
      ? getRecordChatChannelRelationFilter({ objectNameSingular, recordId })
      : null;

  const { records, loading, refetch } = useFindManyRecords({
    objectNameSingular: 'chatChannel',
    filter: (relationFilter ?? undefined) as
      | RecordGqlOperationFilter
      | undefined,
    skip: relationFilter === null,
    recordGqlFields: RECORD_CHAT_CHANNEL_GQL_FIELDS,
    limit: RECORD_CHAT_CHANNELS_LIMIT,
  });

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'chatChannel',
    recordGqlFields: RECORD_CHAT_CHANNEL_GQL_FIELDS,
  });

  const recordChatChannel =
    isDefined(recordId) && isDefined(objectNameSingular)
      ? findRecordChatChannel({
          channels: records as unknown as RecordChatChannel[],
          objectNameSingular,
          recordId,
        })
      : null;

  const provisionRecordChatChannel = useCallback(
    async ({
      recordName,
    }: {
      recordName: string;
    }): Promise<RecordChatChannel | null> => {
      if (!isDefined(recordId) || !isDefined(objectNameSingular)) {
        return null;
      }

      const input = buildRecordChatChannelInput({
        objectNameSingular,
        recordId,
        recordName,
      });

      if (!isDefined(input)) {
        return null;
      }

      const created = await createOneRecord(input);

      await refetch();

      return (created as unknown as RecordChatChannel | undefined) ?? null;
    },
    [createOneRecord, recordId, objectNameSingular, refetch],
  );

  return {
    recordChatChannel,
    provisionRecordChatChannel,
    loading,
  };
};
