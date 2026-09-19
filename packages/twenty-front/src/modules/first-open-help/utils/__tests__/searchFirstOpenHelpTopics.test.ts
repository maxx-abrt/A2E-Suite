import { type MessageDescriptor } from '@lingui/core';

import {
  buildSearchableFirstOpenHelpTopics,
  searchFirstOpenHelpTopics,
} from '@/first-open-help/utils/searchFirstOpenHelpTopics';
import { type FirstOpenHelpTopic } from '@/first-open-help/types/FirstOpenHelpTopic';

const buildTopic = (
  id: string,
  overrides: Partial<FirstOpenHelpTopic> = {},
): FirstOpenHelpTopic => ({
  id,
  kind: 'FEATURE_EXPLANATION',
  title: { message: `Title ${id}` } as MessageDescriptor,
  body: { message: `Body ${id}` } as MessageDescriptor,
  keywords: [],
  ...overrides,
});

const translate = (descriptor: MessageDescriptor) => descriptor.message ?? '';

describe('searchFirstOpenHelpTopics', () => {
  it('returns every topic for an empty or whitespace query', () => {
    const searchableTopics = buildSearchableFirstOpenHelpTopics(
      [buildTopic('a'), buildTopic('b')],
      translate,
    );

    expect(
      searchFirstOpenHelpTopics(searchableTopics, '').map((topic) => topic.id),
    ).toEqual(['a', 'b']);
    expect(
      searchFirstOpenHelpTopics(searchableTopics, '   ').map(
        (topic) => topic.id,
      ),
    ).toEqual(['a', 'b']);
  });

  it('matches title, body and keyword text case-insensitively', () => {
    const searchableTopics = buildSearchableFirstOpenHelpTopics(
      [
        buildTopic('title-match', {
          title: { message: 'Templates' } as MessageDescriptor,
        }),
        buildTopic('body-match', {
          body: { message: 'Saved structure' } as MessageDescriptor,
        }),
        buildTopic('keyword-match', { keywords: ['raccourci'] }),
      ],
      translate,
    );

    expect(
      searchFirstOpenHelpTopics(searchableTopics, 'TEMPL').map(
        (topic) => topic.id,
      ),
    ).toEqual(['title-match']);
    expect(
      searchFirstOpenHelpTopics(searchableTopics, 'structure').map(
        (topic) => topic.id,
      ),
    ).toEqual(['body-match']);
    expect(
      searchFirstOpenHelpTopics(searchableTopics, 'RACCOURCI').map(
        (topic) => topic.id,
      ),
    ).toEqual(['keyword-match']);
  });

  it('ignores diacritics in the query and the stored text', () => {
    const searchableTopics = buildSearchableFirstOpenHelpTopics(
      [
        buildTopic('cafe', {
          title: { message: 'Modèle' } as MessageDescriptor,
        }),
      ],
      translate,
    );

    expect(
      searchFirstOpenHelpTopics(searchableTopics, 'modele').map(
        (topic) => topic.id,
      ),
    ).toEqual(['cafe']);
  });

  it('returns nothing when no topic matches', () => {
    const searchableTopics = buildSearchableFirstOpenHelpTopics(
      [buildTopic('a')],
      translate,
    );

    expect(searchFirstOpenHelpTopics(searchableTopics, 'zzzz')).toEqual([]);
  });
});
