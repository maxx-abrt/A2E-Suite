import {
  buildRecordChatChannelInput,
  findRecordChatChannel,
  getRecordChatChannelRelationFilter,
  getRecordChatChannelTarget,
  type RecordChatChannel,
} from '@/chat/utils/recordChatChannel';

const makeChannel = (
  overrides: Partial<RecordChatChannel>,
): RecordChatChannel => ({
  id: 'channel-id',
  name: 'Discussion',
  kind: 'CUSTOM',
  visibility: 'PUBLIC',
  topic: null,
  ...overrides,
});

describe('getRecordChatChannelTarget', () => {
  it('maps a project record to a PROJECT-kind channel', () => {
    expect(getRecordChatChannelTarget('project')).toEqual({
      relationFieldName: 'project',
      kind: 'PROJECT',
    });
  });

  it('maps a company record to a CUSTOM-kind channel', () => {
    expect(getRecordChatChannelTarget('company')).toEqual({
      relationFieldName: 'company',
      kind: 'CUSTOM',
    });
  });

  it('returns null for an unsupported record object', () => {
    expect(getRecordChatChannelTarget('opportunity')).toBeNull();
  });
});

describe('getRecordChatChannelRelationFilter', () => {
  it('filters by the project relation FK', () => {
    expect(
      getRecordChatChannelRelationFilter({
        objectNameSingular: 'project',
        recordId: 'record-1',
      }),
    ).toEqual({ projectId: { eq: 'record-1' } });
  });

  it('filters by the company relation FK', () => {
    expect(
      getRecordChatChannelRelationFilter({
        objectNameSingular: 'company',
        recordId: 'record-2',
      }),
    ).toEqual({ companyId: { eq: 'record-2' } });
  });

  it('returns null for an unsupported object', () => {
    expect(
      getRecordChatChannelRelationFilter({
        objectNameSingular: 'task',
        recordId: 'record-3',
      }),
    ).toBeNull();
  });
});

describe('findRecordChatChannel', () => {
  it('returns the channel linked to the project record', () => {
    const channel = findRecordChatChannel({
      channels: [
        makeChannel({ id: 'other', projectId: 'record-b' }),
        makeChannel({ id: 'match', projectId: 'record-a' }),
      ],
      objectNameSingular: 'project',
      recordId: 'record-a',
    });

    expect(channel?.id).toBe('match');
  });

  it('returns null when no channel is linked', () => {
    expect(
      findRecordChatChannel({
        channels: [makeChannel({ companyId: 'record-b' })],
        objectNameSingular: 'company',
        recordId: 'record-a',
      }),
    ).toBeNull();
  });
});

describe('buildRecordChatChannelInput', () => {
  it('builds a PROJECT-kind input with the project FK', () => {
    expect(
      buildRecordChatChannelInput({
        objectNameSingular: 'project',
        recordId: 'record-a',
        recordName: 'Refonte du site',
      }),
    ).toEqual({
      name: 'Refonte du site',
      kind: 'PROJECT',
      visibility: 'PUBLIC',
      projectId: 'record-a',
    });
  });

  it('builds a CUSTOM-kind input with the company FK', () => {
    expect(
      buildRecordChatChannelInput({
        objectNameSingular: 'company',
        recordId: 'record-b',
        recordName: 'Acme',
      }),
    ).toEqual({
      name: 'Acme',
      kind: 'CUSTOM',
      visibility: 'PUBLIC',
      companyId: 'record-b',
    });
  });

  it('falls back to a default name when the record name is blank', () => {
    expect(
      buildRecordChatChannelInput({
        objectNameSingular: 'company',
        recordId: 'record-b',
        recordName: '   ',
      })?.name,
    ).toBe('Discussion');
  });

  it('returns null for an unsupported object', () => {
    expect(
      buildRecordChatChannelInput({
        objectNameSingular: 'note',
        recordId: 'record-c',
        recordName: 'Note',
      }),
    ).toBeNull();
  });
});
