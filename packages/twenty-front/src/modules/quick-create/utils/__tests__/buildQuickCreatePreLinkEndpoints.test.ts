import { buildA2eLinkRecordInput } from '@/a2e-links/utils/buildA2eLinkRecordInput';
import {
  buildQuickCreatePreLinkEndpoints,
  shouldPreLinkQuickCreate,
} from '@/quick-create/utils/buildQuickCreatePreLinkEndpoints';

describe('shouldPreLinkQuickCreate', () => {
  it('pre-links a linkable created item from a linkable record when a2e-links is installed', () => {
    expect(
      shouldPreLinkQuickCreate({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'document',
        createdObjectNameSingular: 'task',
      }),
    ).toBe(true);
  });

  it('does not pre-link without a2e-links', () => {
    expect(
      shouldPreLinkQuickCreate({
        isA2eLinksApplicationInstalled: false,
        sourceObjectNameSingular: 'document',
        createdObjectNameSingular: 'task',
      }),
    ).toBe(false);
  });

  it('does not pre-link a created item with no declared morph leg', () => {
    expect(
      shouldPreLinkQuickCreate({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'company',
        createdObjectNameSingular: 'task',
      }),
    ).toBe(false);

    expect(
      shouldPreLinkQuickCreate({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'document',
        createdObjectNameSingular: 'project',
      }),
    ).toBe(false);
  });

  it('does not pre-link when there is no current record', () => {
    expect(
      shouldPreLinkQuickCreate({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: undefined,
        createdObjectNameSingular: 'task',
      }),
    ).toBe(false);
  });
});

describe('buildQuickCreatePreLinkEndpoints', () => {
  it('writes the a2eLink junction row for a created item from a record', () => {
    const endpoints = buildQuickCreatePreLinkEndpoints({
      sourceObjectNameSingular: 'document',
      sourceRecordId: 'doc-1',
      createdObjectNameSingular: 'task',
      createdRecordId: 'task-1',
    });

    expect(buildA2eLinkRecordInput(endpoints)).toEqual({
      linkKey: 'document:doc-1:task:task-1',
      linkType: 'USER_LINK',
      sourceDocumentId: 'doc-1',
      targetTaskId: 'task-1',
    });
  });
});
