import { type MessageDescriptor } from '@lingui/core';

import { type A2eHelpDocPageKey } from '@/a2e-help/constants/A2eHelpDocPages';

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
  // The doc page this topic deep-links to (M12g). Optional so a topic can
  // ship before its page exists; the panel hides the link when absent.
  docPageKey?: A2eHelpDocPageKey;
};
