import { buildSynaRecipePreview } from '@/ai/utils/buildSynaRecipePreview';
import { resolveSynaRecipeExecution } from '@/ai/utils/resolveSynaRecipeExecution';

describe('Syna recipe preview and execution', () => {
  it('turns a non-P7 trigger into its previewed writes', () => {
    const preview = buildSynaRecipePreview('syna-resume-page');

    expect(preview?.status).toBe('READY');
    expect(preview?.writes).toHaveLength(1);
    expect(preview?.writes[0].object).toBe('document');
    expect(preview?.writes[0].count).toBe(1);
  });

  it('returns undefined for an unknown recipe key', () => {
    expect(buildSynaRecipePreview('syna-unknown')).toBeUndefined();
    expect(resolveSynaRecipeExecution('syna-unknown')).toBeUndefined();
  });

  it('resolves a ready recipe to the tool it stages', () => {
    expect(resolveSynaRecipeExecution('syna-traduire-page')).toEqual({
      status: 'READY',
      requiredToolName: 'app_translate_document',
    });
  });

  it('reports the P7 gate for the deferred recipe instead of half-running', () => {
    expect(resolveSynaRecipeExecution('syna-facture-depuis-temps')).toEqual({
      status: 'DEFERRED',
      gatedBy: 'P7',
    });
  });
});
