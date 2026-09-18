import { isDefined } from 'twenty-shared/utils';

import {
  type ChatChannel,
  type ChatChannelKind,
  type ChatChannelVisibility,
} from '@/chat/types/ChatChannel';

// Record objects that can own a discussion channel. The relation field name on
// `chatChannel` is the FK the a2e-chat manifest declares; the channel kind
// follows the P5.1 model (PROJECT for project records; company records have no
// dedicated kind, so they use CUSTOM).
type RecordChatChannelTarget = {
  relationFieldName: string;
  kind: ChatChannelKind;
};

const RECORD_CHAT_CHANNEL_TARGETS: Record<string, RecordChatChannelTarget> = {
  project: { relationFieldName: 'project', kind: 'PROJECT' },
  company: { relationFieldName: 'company', kind: 'CUSTOM' },
};

export type RecordChatChannel = ChatChannel & {
  projectId?: string | null;
  companyId?: string | null;
};

export const getRecordChatChannelTarget = (
  objectNameSingular: string,
): RecordChatChannelTarget | null =>
  RECORD_CHAT_CHANNEL_TARGETS[objectNameSingular] ?? null;

export const getRecordChatChannelRelationFilter = ({
  objectNameSingular,
  recordId,
}: {
  objectNameSingular: string;
  recordId: string;
}): Record<string, { eq: string }> | null => {
  const target = getRecordChatChannelTarget(objectNameSingular);

  if (!isDefined(target)) {
    return null;
  }

  return { [`${target.relationFieldName}Id`]: { eq: recordId } };
};

export const findRecordChatChannel = ({
  channels,
  objectNameSingular,
  recordId,
}: {
  channels: RecordChatChannel[];
  objectNameSingular: string;
  recordId: string;
}): RecordChatChannel | null => {
  const target = getRecordChatChannelTarget(objectNameSingular);

  if (!isDefined(target)) {
    return null;
  }

  const relationFieldName = `${target.relationFieldName}Id` as
    | 'projectId'
    | 'companyId';

  return (
    channels.find((channel) => channel[relationFieldName] === recordId) ?? null
  );
};

export type RecordChatChannelInput = {
  name: string;
  kind: ChatChannelKind;
  visibility: ChatChannelVisibility;
  projectId?: string;
  companyId?: string;
};

export const buildRecordChatChannelInput = ({
  objectNameSingular,
  recordId,
  recordName,
}: {
  objectNameSingular: string;
  recordId: string;
  recordName: string;
}): RecordChatChannelInput | null => {
  const target = getRecordChatChannelTarget(objectNameSingular);

  if (!isDefined(target)) {
    return null;
  }

  const input: RecordChatChannelInput = {
    name: recordName.trim().length > 0 ? recordName.trim() : 'Discussion',
    kind: target.kind,
    visibility: 'PUBLIC',
  };

  if (target.relationFieldName === 'project') {
    input.projectId = recordId;
  } else {
    input.companyId = recordId;
  }

  return input;
};
