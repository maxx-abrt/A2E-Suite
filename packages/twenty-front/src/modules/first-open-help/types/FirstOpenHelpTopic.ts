import { type MessageDescriptor } from '@lingui/core';

// R15 contributes explanatory patterns only — a feature explanation, a
// comparison and an FAQ. The kind drives grouping and labels, never
// marketing or pricing copy.
export type FirstOpenHelpTopicKind =
  | 'FEATURE_EXPLANATION'
  | 'COMPARISON'
  | 'FAQ';

export type FirstOpenHelpTopic = {
  id: string;
  kind: FirstOpenHelpTopicKind;
  title: MessageDescriptor;
  body: MessageDescriptor;
  keywords: string[];
};
