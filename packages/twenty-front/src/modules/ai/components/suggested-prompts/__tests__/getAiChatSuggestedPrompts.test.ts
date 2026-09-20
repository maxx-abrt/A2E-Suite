import { CoreObjectNameSingular } from 'twenty-shared/types';

import { getAiChatSuggestedPrompts } from '@/ai/components/suggested-prompts/getAiChatSuggestedPrompts';

const getPromptIds = (...args: Parameters<typeof getAiChatSuggestedPrompts>) =>
  getAiChatSuggestedPrompts(...args).map(({ id }) => id);

describe('getAiChatSuggestedPrompts', () => {
  it('should offer the capability prompt when the user is not browsing anything', () => {
    expect(getPromptIds(null)).toContain('capabilities');
  });

  it('should send the capability prompt straight away rather than prefilling it', () => {
    const capabilitiesPrompt = getAiChatSuggestedPrompts(null).find(
      ({ id }) => id === 'capabilities',
    );

    expect(capabilitiesPrompt?.mode).toBe('SEND');
  });

  it('should offer view prompts while browsing a list', () => {
    expect(
      getPromptIds({
        browsingContextType: 'listView',
        objectNameSingular: CoreObjectNameSingular.Company,
      }),
    ).toEqual(['summarize-view', 'filter-view', 'create-record-in-view']);
  });

  it('should offer channel prompts when a chat channel is open', () => {
    expect(
      getPromptIds({
        browsingContextType: 'chatChannel',
        objectNameSingular: 'chatChannel',
      }),
    ).toEqual(['summarize-channel', 'catch-up-on-channel']);
  });

  it('should offer workflow prompts on a workflow record', () => {
    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: CoreObjectNameSingular.Workflow,
      }),
    ).toEqual(['explain-workflow', 'add-workflow-step', 'check-workflow-runs']);
  });

  it('should offer company prompts on a company record', () => {
    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: CoreObjectNameSingular.Company,
      }),
    ).toContain('research-company');
  });

  it('should offer the per-app actions on their app-owned record pages', () => {
    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: 'document',
      }),
    ).toEqual([
      'summarize-document',
      'extract-tasks-from-document',
      'translate-document',
      'improve-document-writing',
    ]);

    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: 'project',
      }),
    ).toEqual(['standup-digest', 'task-breakdown-context']);

    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: 'driveFolder',
      }),
    ).toEqual(['find-file', 'dedupe-hints']);

    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: CoreObjectNameSingular.Person,
      }),
    ).toEqual(['assist-record-enrichment']);

    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: CoreObjectNameSingular.MessageThread,
      }),
    ).toEqual(['draft-email-reply']);
  });

  it('should fall back to object-agnostic prompts on a custom object record', () => {
    expect(
      getPromptIds({
        browsingContextType: 'recordPage',
        objectNameSingular: 'petCareAgreement',
      }),
    ).toEqual([
      'summarize-record',
      'add-note-to-record',
      'create-task-for-record',
    ]);
  });
});
