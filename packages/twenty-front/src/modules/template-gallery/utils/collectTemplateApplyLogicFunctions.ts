import { type LogicFunction } from '@/logic-functions/types/LogicFunction';
import { type FlatApplication } from '@/metadata-store/types/FlatApplication';
import { TEMPLATE_APPLY_LOGIC_FUNCTION_NAME } from '@/template-gallery/constants/TemplateApplyLogicFunctionName';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';

export type TemplateApplyLogicFunctionTarget = {
  application: FlatApplication;
  logicFunctionId: string;
};

// Resolves, per installed application, the logic function the gallery must call
// to apply one of that app's descriptors. Matching is by the well-known function
// name on an application the workspace actually has installed, so an unrelated
// function that happens to share the name is ignored.
export const collectTemplateApplyLogicFunctions = ({
  logicFunctions,
  applications,
}: {
  logicFunctions: LogicFunction[];
  applications: FlatApplication[];
}): TemplateApplyLogicFunctionTarget[] => {
  const applicationsById = new Map(
    applications.map((application) => [application.id, application]),
  );

  return logicFunctions.flatMap((logicFunction) => {
    if (logicFunction.name !== TEMPLATE_APPLY_LOGIC_FUNCTION_NAME) {
      return [];
    }

    if (!isNonEmptyString(logicFunction.applicationId)) {
      return [];
    }

    const application = applicationsById.get(logicFunction.applicationId);

    if (!isDefined(application)) {
      return [];
    }

    return [{ application, logicFunctionId: logicFunction.id }];
  });
};
