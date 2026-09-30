import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { logicFunctionsSelector } from '@/logic-functions/states/logicFunctionsSelector';
import { buildTemplateGalleryItems } from '@/template-gallery/utils/buildTemplateGalleryItems';
import { collectTemplateDescriptorLogicFunctions } from '@/template-gallery/utils/collectTemplateDescriptorLogicFunctions';
import { type TemplateGalleryDescriptorGroup } from '@/template-gallery/types/TemplateGalleryDescriptorGroup';
import { useEffect, useMemo, useState } from 'react';
import {
  ExecuteOneLogicFunctionDocument,
  type ExecuteOneLogicFunctionMutation,
} from '~/generated-metadata/graphql';
import { useMutation } from '@apollo/client/react';
import {
  isTemplateDescriptor,
  type TemplateDescriptor,
} from 'twenty-shared/application';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Executes every installed app's `list-template-descriptors` logic function and
// merges the results into the gallery's install-gated item list. The apps are
// discovered from the metadata store (so a newly installed app is picked up),
// and a function that fails to execute is skipped rather than failing the whole
// gallery — install-gating stays a per-descriptor safe state.
export const useTemplateGalleryItems = (): {
  items: ReturnType<typeof buildTemplateGalleryItems>;
  isLoading: boolean;
  hasError: boolean;
} => {
  const applications = useAtomStateValue(applicationsSelector);
  const logicFunctions = useAtomStateValue(logicFunctionsSelector);
  const [executeOneLogicFunction] =
    useMutation<ExecuteOneLogicFunctionMutation>(
      ExecuteOneLogicFunctionDocument,
    );

  const [descriptorGroups, setDescriptorGroups] = useState<
    TemplateGalleryDescriptorGroup[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const targets = useMemo(
    () =>
      collectTemplateDescriptorLogicFunctions({ logicFunctions, applications }),
    [logicFunctions, applications],
  );

  useEffect(() => {
    let isCancelled = false;

    const loadDescriptorGroups = async () => {
      setIsLoading(true);
      setHasError(false);

      const groups: TemplateGalleryDescriptorGroup[] = [];
      let encounteredError = false;

      for (const target of targets) {
        try {
          const result = await executeOneLogicFunction({
            variables: { input: { id: target.logicFunctionId } },
          });

          const templates = extractTemplateDescriptors(
            result.data?.executeOneLogicFunction?.data,
          );

          groups.push({
            applicationUniversalIdentifier:
              target.application.universalIdentifier,
            applicationName: target.application.name,
            templates,
          });
        } catch {
          encounteredError = true;
        }
      }

      if (!isCancelled) {
        setDescriptorGroups(groups);
        setHasError(encounteredError);
        setIsLoading(false);
      }
    };

    loadDescriptorGroups();

    return () => {
      isCancelled = true;
    };
  }, [targets, executeOneLogicFunction]);

  const items = useMemo(
    () =>
      buildTemplateGalleryItems({
        descriptorGroups,
        installedApplicationUniversalIdentifiers: applications.map(
          (application) => application.universalIdentifier,
        ),
      }),
    [descriptorGroups, applications],
  );

  return { items, isLoading, hasError };
};

// A logic function returns plain JSON across the boundary; only well-formed C1
// descriptors cross into the gallery.
const extractTemplateDescriptors = (data: unknown): TemplateDescriptor[] => {
  if (typeof data !== 'object' || data === null) {
    return [];
  }

  const templates = (data as { templates?: unknown }).templates;

  if (!Array.isArray(templates)) {
    return [];
  }

  return templates.filter(isTemplateDescriptor);
};
