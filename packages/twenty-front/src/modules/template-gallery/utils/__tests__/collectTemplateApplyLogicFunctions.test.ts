import { collectTemplateApplyLogicFunctions } from '@/template-gallery/utils/collectTemplateApplyLogicFunctions';
import { type LogicFunction } from '@/logic-functions/types/LogicFunction';
import { type FlatApplication } from '@/metadata-store/types/FlatApplication';

const installedApplication = {
  id: 'application-documents',
  universalIdentifier: 'a2e-documents-universal-identifier',
  name: 'A2E Documents',
} as unknown as FlatApplication;

const applyTemplateFunction = {
  id: 'logic-function-documents-apply',
  name: 'apply-template',
  applicationId: 'application-documents',
} as unknown as LogicFunction;

const listTemplateDescriptorsFunction = {
  id: 'logic-function-documents-descriptors',
  name: 'list-template-descriptors',
  applicationId: 'application-documents',
} as unknown as LogicFunction;

const applyFunctionWithoutApplication = {
  id: 'logic-function-orphan-apply',
  name: 'apply-template',
  applicationId: null,
} as unknown as LogicFunction;

describe('collectTemplateApplyLogicFunctions', () => {
  it('resolves the apply function of an installed application', () => {
    const targets = collectTemplateApplyLogicFunctions({
      logicFunctions: [applyTemplateFunction],
      applications: [installedApplication],
    });

    expect(targets).toEqual([
      {
        application: installedApplication,
        logicFunctionId: 'logic-function-documents-apply',
      },
    ]);
  });

  it('ignores functions that are not apply functions', () => {
    const targets = collectTemplateApplyLogicFunctions({
      logicFunctions: [listTemplateDescriptorsFunction],
      applications: [installedApplication],
    });

    expect(targets).toEqual([]);
  });

  it('ignores an apply function whose application is not installed', () => {
    const targets = collectTemplateApplyLogicFunctions({
      logicFunctions: [applyTemplateFunction],
      applications: [],
    });

    expect(targets).toEqual([]);
  });

  it('ignores an apply function without an owning application', () => {
    const targets = collectTemplateApplyLogicFunctions({
      logicFunctions: [applyFunctionWithoutApplication],
      applications: [installedApplication],
    });

    expect(targets).toEqual([]);
  });
});
