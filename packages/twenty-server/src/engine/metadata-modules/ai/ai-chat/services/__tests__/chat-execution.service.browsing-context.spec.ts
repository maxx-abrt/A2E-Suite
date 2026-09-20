import { ChatExecutionService } from 'src/engine/metadata-modules/ai/ai-chat/services/chat-execution.service';

const buildService = () => {
  const workspaceDomainsService = {
    buildWorkspaceURL: jest.fn(
      ({ pathname }: { pathname: string }) =>
        `https://workspace.example.com${pathname}`,
    ),
  };

  const service = new ChatExecutionService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    workspaceDomainsService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, workspaceDomainsService };
};

const WORKSPACE = { id: 'workspace-id' } as never;

// buildContextFromBrowsingContext is the send-time path the browsing context
// reaches: a private helper, so it is exercised through the instance as the
// service composes it.
const buildContext = (
  service: ChatExecutionService,
  browsingContext: Parameters<
    ChatExecutionService['buildContextFromBrowsingContext']
  >[1],
) => service['buildContextFromBrowsingContext'](WORKSPACE, browsingContext);

describe('ChatExecutionService browsing context', () => {
  it('should name the channel id the browser sent for a chatChannel context', () => {
    const { service } = buildService();

    const context = buildContext(service, {
      type: 'chatChannel',
      objectNameSingular: 'chatChannel',
      channelId: 'channel-1',
    });

    expect(context).toContain('channel-1');
  });

  it('should keep the record-page context unchanged', () => {
    const { service } = buildService();

    const context = buildContext(service, {
      type: 'recordPage',
      objectNameSingular: 'company',
      recordId: 'record-1',
    });

    expect(context).toContain('company record (ID: record-1');
    expect(context).not.toContain('chat channel');
  });

  it('should keep the list-view context unchanged', () => {
    const { service } = buildService();

    const context = buildContext(service, {
      type: 'listView',
      objectNameSingular: 'company',
      viewId: 'view-1',
      viewName: 'All companies',
      filterDescriptions: [],
    });

    expect(context).toContain('All companies');
    expect(context).not.toContain('chat channel');
  });
});
