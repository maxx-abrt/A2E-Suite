import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { type FirstOpenHelpTopicKind } from '~/modules/first-open-help/types/FirstOpenHelpTopic';

export const FIRST_OPEN_HELP_TOPIC_KIND_LABELS: Record<
  FirstOpenHelpTopicKind,
  MessageDescriptor
> = {
  FEATURE_EXPLANATION: msg`What it does`,
  COMPARISON: msg`Which to choose`,
  FAQ: msg`Common question`,
};
