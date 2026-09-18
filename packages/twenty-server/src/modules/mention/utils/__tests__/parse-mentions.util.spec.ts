import { parseMentions } from 'src/modules/mention/utils/parse-mentions.util';

const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const BOB_MEMBER_ID = '20202020-99f5-4cb6-b60a-f4a835a85d63';
const COMPANY_RECORD_ID = '20202020-aaaa-4cb6-b60a-f4a835a85d64';

const buildDocumentContent = (
  objectNameSingular: string,
  recordId: string,
): string =>
  JSON.stringify([
    {
      id: 'block-1',
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bonjour ' },
        {
          type: 'mention',
          props: {
            objectNameSingular,
            recordId,
            label: 'Alice',
          },
        },
        { type: 'text', text: ', peux-tu relire ?' },
      ],
    },
    {
      id: 'block-2',
      type: 'paragraph',
      content: [{ type: 'text', text: 'Sans mention' }],
    },
  ]);

describe('parseMentions — chat surface', () => {
  it('reads the Markdown-lite mention ids and builds a readable snippet', () => {
    const extraction = parseMentions({
      surface: 'chat',
      body: `Salut @[Alice](${ALICE_MEMBER_ID}) et @[Bob](${BOB_MEMBER_ID})`,
    });

    expect(extraction).toEqual({
      mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID, BOB_MEMBER_ID],
      contextSnippet: 'Salut @Alice et @Bob',
    });
  });

  it('ignores plain @words and a null body', () => {
    expect(parseMentions({ surface: 'chat', body: 'salut @tous' })).toEqual({
      mentionedWorkspaceMemberIds: [],
      contextSnippet: '',
    });
    expect(parseMentions({ surface: 'chat', body: null })).toEqual({
      mentionedWorkspaceMemberIds: [],
      contextSnippet: '',
    });
  });
});

describe('parseMentions — document surface', () => {
  it('reads workspaceMember mention nodes from the BlockNote body with the sentence as snippet', () => {
    const extraction = parseMentions({
      surface: 'document',
      body: buildDocumentContent('workspaceMember', ALICE_MEMBER_ID),
    });

    expect(extraction).toEqual({
      mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID],
      contextSnippet: 'Bonjour @Alice, peux-tu relire ?',
    });
  });

  it('ignores mentions of a non-member record (chip label is still context text)', () => {
    const extraction = parseMentions({
      surface: 'document',
      body: buildDocumentContent('company', COMPANY_RECORD_ID),
    });

    expect(extraction.mentionedWorkspaceMemberIds).toEqual([]);
  });

  it('accepts an already-parsed BlockNote array and tolerates malformed JSON', () => {
    const parsed = JSON.parse(
      buildDocumentContent('workspaceMember', ALICE_MEMBER_ID),
    );

    expect(
      parseMentions({ surface: 'document', body: parsed })
        .mentionedWorkspaceMemberIds,
    ).toEqual([ALICE_MEMBER_ID]);
    expect(parseMentions({ surface: 'document', body: '{not json' })).toEqual({
      mentionedWorkspaceMemberIds: [],
      contextSnippet: '',
    });
  });
});

describe('parseMentions — comment surface', () => {
  it('reads mention nodes from every comment body and previews the mentioning comment', () => {
    const comments = [
      {
        id: 'comment-1',
        userId: ALICE_MEMBER_ID,
        createdAt: '2026-09-18T10:00:00.000Z',
        body: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Cc ' },
              {
                type: 'mention',
                props: {
                  objectNameSingular: 'workspaceMember',
                  recordId: BOB_MEMBER_ID,
                  label: 'Bob',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'comment-2',
        userId: BOB_MEMBER_ID,
        createdAt: '2026-09-18T10:05:00.000Z',
        body: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Merci !' }],
          },
        ],
      },
    ];

    expect(parseMentions({ surface: 'comment', body: comments })).toEqual({
      mentionedWorkspaceMemberIds: [BOB_MEMBER_ID],
      contextSnippet: 'Cc @Bob',
    });
  });
});
