import { collectTemplateDescriptorLogicFunctions } from '@/template-gallery/utils/collectTemplateDescriptorLogicFunctions';
import { type LogicFunction } from '@/logic-functions/types/LogicFunction';
import { type FlatApplication } from '@/metadata-store/types/FlatApplication';

const installedApplication = {
  id: 'application-documents',
  universalIdentifier: 'a2e-documents-universal-identifier',
  name: 'A2E Documents',
} as unknown as FlatApplication;

const listTemplateDescriptorsFunction = {
  id: 'logic-function-documents-descriptors',
  name: 'list-template-descriptors',
  applicationId: 'application-documents',
} as unknown as LogicFunction;

const unrelatedFunction = {
  id: 'logic-function-documents-summarize',
  name: 'summarize-document',
  applicationId: 'application-documents',
} as unknown as LogicFunction;

const missingApplicationFunction = {
  id: 'logic-function-accounting-descriptors',
  name: 'list-template-descriptors',
  applicationId: 'application-accounting',
} as unknown as LogicFunction;

describe('collectTemplateDescriptorLogicFunctions', () => {
  it('resolves the descriptor function of an installed application', () => {
    const targets = collectTemplateDescriptorLogicFunctions({
      logicFunctions: [listTemplateDescriptorsFunction],
      applications: [installedApplication],
    });

    expect(targets).toEqual([
      {
        application: installedApplication,
        logicFunctionId: 'logic-function-documents-descriptors',
      },
    ]);
  });

  it('ignores functions that are not descriptor functions', () => {
    const targets = collectTemplateDescriptorLogicFunctions({
      logicFunctions: [unrelatedFunction],
      applications: [installedApplication],
    });

    expect(targets).toEqual([]);
  });

  it('ignores a descriptor function whose application is not installed', () => {
    const targets = collectTemplateDescriptorLogicFunctions({
      logicFunctions: [missingApplicationFunction],
      applications: [installedApplication],
    });

    expect(targets).toEqual([]);
  });
});
