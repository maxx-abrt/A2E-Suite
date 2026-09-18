import { RelationType } from 'twenty-sdk/define';

// Shared relation vocabulary, matching the A2E Documents/Projects apps so a
// relation declaration reads the same in every first-party app.
export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export const manyToOne = (joinColumnName: string) =>
  ({ relationType: RelationType.MANY_TO_ONE, joinColumnName }) as const;
