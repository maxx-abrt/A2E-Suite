import { type MessageDescriptor } from '@lingui/core';

import { type FirstOpenHelpTopic } from '~/modules/first-open-help/types/FirstOpenHelpTopic';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

export type SearchableFirstOpenHelpTopic = {
  topic: FirstOpenHelpTopic;
  searchText: string;
};

export const buildSearchableFirstOpenHelpTopics = (
  topics: FirstOpenHelpTopic[],
  translate: (descriptor: MessageDescriptor) => string,
): SearchableFirstOpenHelpTopic[] =>
  topics.map((topic) => ({
    topic,
    searchText: normalizeSearchText(
      [
        translate(topic.title),
        translate(topic.body),
        topic.keywords.join(' '),
      ].join(' '),
    ),
  }));

export const searchFirstOpenHelpTopics = (
  searchableTopics: SearchableFirstOpenHelpTopic[],
  query: string,
): FirstOpenHelpTopic[] => {
  const normalizedQuery = normalizeSearchText(query.trim());

  if (normalizedQuery.length === 0) {
    return searchableTopics.map(({ topic }) => topic);
  }

  return searchableTopics
    .filter(({ searchText }) => searchText.includes(normalizedQuery))
    .map(({ topic }) => topic);
};
