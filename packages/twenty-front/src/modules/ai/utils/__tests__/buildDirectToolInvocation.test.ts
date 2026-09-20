import { type BrowsingContext } from '@/ai/types/BrowsingContext';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import { buildDirectToolInvocation } from '@/ai/utils/buildDirectToolInvocation';

const recordPageContext: BrowsingContext = {
  type: 'recordPage',
  objectNameSingular: 'document',
  recordId: 'document-record-id',
};

const chatChannelContext: BrowsingContext = {
  type: 'chatChannel',
  objectNameSingular: 'chatChannel',
  channelId: 'channel-id',
};

const listViewContext: BrowsingContext = {
  type: 'listView',
  objectNameSingular: 'document',
  viewId: 'view-id',
  viewName: 'All documents',
  filterDescriptions: [],
};

const readOnlyButton = (
  overrides: Partial<ContextToolButton> = {},
): ContextToolButton => ({
  toolName: 'app_document_content',
  label: 'Document Content',
  description: 'Reads a document.',
  applicationId: 'documents-app-id',
  readOnly: true,
  requiresConfirmation: false,
  ...overrides,
});

describe('buildDirectToolInvocation', () => {
  it('fills the record id from the browsing context for a record page', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        inputSchema: {
          type: 'object',
          properties: { documentId: { type: 'string' } },
          required: ['documentId'],
        },
      }),
      browsingContext: recordPageContext,
    });

    expect(result).toEqual({
      kind: 'invocation',
      invocation: {
        toolName: 'app_document_content',
        arguments: { documentId: 'document-record-id' },
      },
    });
  });

  it('fills the channel id from a chat channel context (US-066)', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        toolName: 'app_summarize_channel',
        inputSchema: {
          type: 'object',
          properties: { channelId: { type: 'string' } },
          required: ['channelId'],
        },
      }),
      browsingContext: chatChannelContext,
    });

    expect(result).toEqual({
      kind: 'invocation',
      invocation: {
        toolName: 'app_summarize_channel',
        arguments: { channelId: 'channel-id' },
      },
    });
  });

  it('dispatches an empty argument set when the tool requires no context input', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        inputSchema: { type: 'object', properties: {} },
      }),
      browsingContext: listViewContext,
    });

    expect(result).toEqual({
      kind: 'invocation',
      invocation: { toolName: 'app_document_content', arguments: {} },
    });
  });

  it('refuses a mutating button before any dispatch (fail-closed, C6)', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        readOnly: false,
        requiresConfirmation: true,
      }),
      browsingContext: recordPageContext,
    });

    expect(result).toEqual({
      kind: 'refused',
      reason: 'MUTATING_TOOL_NOT_DIRECTLY_EXECUTABLE',
    });
  });

  it('refuses when there is no browsing context to fill from', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton(),
      browsingContext: null,
    });

    expect(result).toEqual({ kind: 'refused', reason: 'NO_BROWSING_CONTEXT' });
  });

  it('refuses when a required target cannot be filled from the context', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        inputSchema: {
          type: 'object',
          properties: { documentId: { type: 'string' } },
          required: ['documentId'],
        },
      }),
      browsingContext: listViewContext,
    });

    expect(result).toEqual({
      kind: 'refused',
      reason: 'MISSING_REQUIRED_INPUT',
    });
  });

  it('refuses when a required non-context input is missing', () => {
    const result = buildDirectToolInvocation({
      contextToolButton: readOnlyButton({
        toolName: 'app_extract_tasks_from_document',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            projectId: { type: 'string' },
          },
          required: ['documentId', 'projectId'],
        },
      }),
      browsingContext: recordPageContext,
    });

    expect(result).toEqual({
      kind: 'refused',
      reason: 'MISSING_REQUIRED_INPUT',
    });
  });
});
