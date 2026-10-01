import { useCallback, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { type TemplateApplyResult } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { useLingui } from '@lingui/react/macro';

import { useOpenAskAiPageWithPreprompt } from '@/ai/hooks/useOpenAskAiPageWithPreprompt';
import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';
import { resolveSynaRecipeExecution } from '@/ai/utils/resolveSynaRecipeExecution';

// Host wiring for a Syna recipe (M9c/US-143). Applying a recipe never writes:
// it stages the recipe's prompt as a Syna chat draft, which the user reviews and
// confirms (UX principle 5). A DEFERRED recipe (P7) reports the gate and stages
// nothing — it never half-runs. The descriptor's `prompt` ships both languages
// as plain strings, so the hook picks the one matching the active locale.
export const useSynaRecipeApply = () => {
  const { i18n } = useLingui();
  const { openAskAiPageWithPreprompt } = useOpenAskAiPageWithPreprompt();
  const [isApplying, setIsApplying] = useState(false);

  const applySynaRecipeItem = useCallback(
    async (
      key: string,
      operationId: string | null,
    ): Promise<TemplateApplyResult | null> => {
      const descriptor = findSynaRecipeDescriptor(key);
      const execution = resolveSynaRecipeExecution(key);

      if (!isDefined(descriptor) || !isDefined(execution)) {
        return null;
      }

      if (execution.status === 'DEFERRED') {
        return null;
      }

      setIsApplying(true);

      try {
        const isEnglishLocale = isNonEmptyString(i18n.locale)
          ? i18n.locale.toLowerCase().startsWith('en')
          : false;

        openAskAiPageWithPreprompt({
          text: isEnglishLocale ? descriptor.prompt.en : descriptor.prompt.fr,
        });

        return {
          status: 'applied',
          key: descriptor.key,
          version: descriptor.version,
          operationId,
          created: [],
        };
      } finally {
        setIsApplying(false);
      }
    },
    [i18n.locale, openAskAiPageWithPreprompt],
  );

  return { applySynaRecipeItem, isApplying };
};
