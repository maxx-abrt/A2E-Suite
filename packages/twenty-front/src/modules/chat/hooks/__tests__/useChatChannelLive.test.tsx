import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_TYPING_EVENT_TYPE,
} from '@/chat/types/ChatRealtimeEvent';
import { useChatChannelLive } from '@/chat/hooks/useChatChannelLive';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import {
  createRealtimeMockServerHarness,
  type RealtimeMockServerHarness,
} from '~/modules/realtime/testing/RealtimeMockServerHarness';
import { realtimeConnectionManager } from '~/modules/realtime/utils/realtimeConnectionManager';

const WORKSPACE_ID = 'workspace-1';
const CHANNEL_ID = 'channel-1';
const TOPIC = `workspace:${WORKSPACE_ID}:chat:${CHANNEL_ID}`;

const buildMessage = (id: string, body: string): ChatMessage => ({
  id,
  body,
  channelId: CHANNEL_ID,
  authorId: 'member-1',
  threadParentId: null,
  createdAt: '2026-01-01T01:00:00.000Z',
  editedAt: null,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

describe('useChatChannelLive', () => {
  let harness: RealtimeMockServerHarness;

  beforeEach(() => {
    harness = createRealtimeMockServerHarness();
    harness.install(realtimeConnectionManager);
    jotaiStore.set(currentWorkspaceState.atom, { id: WORKSPACE_ID } as never);
  });

  afterEach(() => {
    realtimeConnectionManager.destroy();
    act(() => {
      jotaiStore.set(currentWorkspaceState.atom, null);
    });
  });

  it('should subscribe to the channel topic and fold a live message into the list', async () => {
    const { result } = renderHook(
      () =>
        useChatChannelLive({
          channelId: CHANNEL_ID,
          loadedMessages: [],
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain(TOPIC);
    });

    expect(JSON.parse(harness.getLastSentMessage() ?? '{}')).toMatchObject({
      action: 'subscribe',
      topic: TOPIC,
    });

    act(() => {
      harness.broadcast(TOPIC, {
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        occurredAt: '2026-01-01T02:00:00.000Z',
        message: {
          ...buildMessage('m2', 'second'),
          createdAt: '2026-01-01T02:00:00.000Z',
          deletedAt: null,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.messages.map((message) => message.body)).toEqual([
        'second',
      ]);
    });
  });

  it('should not duplicate a message already loaded from the page query', async () => {
    const loadedMessages = [buildMessage('m1', 'first')];

    const { result } = renderHook(
      () =>
        useChatChannelLive({
          channelId: CHANNEL_ID,
          loadedMessages,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain(TOPIC);
    });

    act(() => {
      harness.broadcast(TOPIC, {
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        occurredAt: '2026-01-01T03:00:00.000Z',
        message: {
          ...buildMessage('m1', 'first'),
          createdAt: '2026-01-01T03:00:00.000Z',
          deletedAt: null,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
  });

  it('should track a typing member and drop them when typing stops', async () => {
    const { result } = renderHook(
      () =>
        useChatChannelLive({
          channelId: CHANNEL_ID,
          loadedMessages: [],
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(harness.getLastSentMessage()).toContain(TOPIC);
    });

    act(() => {
      harness.broadcast(TOPIC, {
        type: CHAT_TYPING_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        workspaceMemberId: 'member-2',
        isTyping: true,
        occurredAt: '2026-01-01T02:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(result.current.typingWorkspaceMemberIds).toEqual(['member-2']);
    });

    act(() => {
      harness.broadcast(TOPIC, {
        type: CHAT_TYPING_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        workspaceMemberId: 'member-2',
        isTyping: false,
        occurredAt: '2026-01-01T02:00:05.000Z',
      });
    });

    await waitFor(() => {
      expect(result.current.typingWorkspaceMemberIds).toEqual([]);
    });
  });
});
