import { isDefined } from 'twenty-shared/utils';

import { type RealtimeTopicContext } from '../types/realtime-topic-context.type';

// Topics: workspace:<id>[:kind:scope...]. Segment 1 is always the workspace;
// the workspace prefix is the only part the ACL can trust blindly, everything
// after it narrows the scope (channel/user/record ids).
export const parseRealtimeTopic = (topic: string): RealtimeTopicContext => {
  const segments = topic.split(':');

  const [prefix, workspaceId, kind, ...rest] = segments;

  if (prefix !== 'workspace' || !isWorkspaceIdShaped(workspaceId)) {
    throw new Error(`Invalid realtime topic: ${topic}`);
  }

  if (!isDefined(kind)) {
    return { kind: 'workspace', workspaceId };
  }

  switch (kind) {
    case 'presence':
      return { kind: 'presence', workspaceId };
    case 'chat':
      return { kind: 'workspace', workspaceId, channelId: rest[0] };
    case 'inbox':
      return { kind: 'inbox', workspaceId, userId: rest[0] };
    case 'object': {
      const [objectNameSingular, recordId] = rest;

      if (!objectNameSingular || !recordId) {
        throw new Error(`Invalid realtime topic: ${topic}`);
      }

      return { kind: 'object', workspaceId, objectNameSingular, recordId };
    }
    default:
      throw new Error(`Invalid realtime topic: ${topic}`);
  }
};

const isWorkspaceIdShaped = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
