import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';
import { validateSynaRecipeDescriptors } from '@/ai/utils/validateSynaRecipeDescriptors';
import { type SynaRecipeDescriptor } from '@/ai/types/SynaRecipeDescriptor';
import {
  isTemplateDescriptor,
  validateTemplateDescriptors,
} from 'twenty-shared/application';

describe('Syna recipe descriptors', () => {
  it('validates against the shared C1 contract and the family validator', () => {
    expect(validateTemplateDescriptors(SYNA_RECIPE_DESCRIPTORS)).toEqual({
      valid: true,
      errors: [],
    });
    expect(validateSynaRecipeDescriptors(SYNA_RECIPE_DESCRIPTORS)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('registers the eight PLAN M9c recipes under the Syna category', () => {
    expect(SYNA_RECIPE_DESCRIPTORS.map((descriptor) => descriptor.key)).toEqual(
      [
        'syna-resume-page',
        'syna-reunion-vers-taches',
        'syna-digest-hebdomadaire',
        'syna-facture-depuis-temps',
        'syna-eligibilite-subventions',
        'syna-reponse-email',
        'syna-traduire-page',
        'syna-nettoyer-notes',
      ],
    );

    for (const descriptor of SYNA_RECIPE_DESCRIPTORS) {
      expect(isTemplateDescriptor(descriptor)).toBe(true);
      expect(descriptor.category).toBe('Syna');
      expect(descriptor.sourceUniversalIdentifier).toBe('a2e-host-syna');
      expect(descriptor.sourceName).toBe('Syna');
    }
  });

  it('stages a registered AI tool for the AI recipes', () => {
    expect(findSynaRecipeDescriptor('syna-resume-page')?.requiredToolName).toBe(
      'app_summarize_document',
    );
    expect(
      findSynaRecipeDescriptor('syna-reunion-vers-taches')?.requiredToolName,
    ).toBe('app_extract_tasks_from_document');
    expect(
      findSynaRecipeDescriptor('syna-reponse-email')?.requiredToolName,
    ).toBe('app_draft_email_reply');
  });

  it('keeps the invoice-from-time recipe deferred with P7, never built', () => {
    const descriptor = findSynaRecipeDescriptor('syna-facture-depuis-temps');

    expect(descriptor?.status).toBe('DEFERRED');
    expect(descriptor?.preview).toEqual([]);
    expect(descriptor?.requiredToolName).toBeNull();
    expect(descriptor?.deferral?.gatedBy).toBe('P7');
    expect((descriptor?.deferral?.reason.length ?? 0) > 0).toBe(true);
  });

  it('rejects a ready recipe that writes accounting (P7 blocked)', () => {
    const invoiceReady: SynaRecipeDescriptor = {
      ...SYNA_RECIPE_DESCRIPTORS[0]!,
      key: 'syna-test-invoice',
      status: 'READY',
      preview: [
        {
          object: 'invoice',
          summary: { fr: 'Crée une facture.', en: 'Creates an invoice.' },
          count: 1,
        },
      ],
    };

    const validation = validateSynaRecipeDescriptors([
      ...SYNA_RECIPE_DESCRIPTORS.filter(
        (descriptor) => descriptor.status === 'READY',
      ),
      invoiceReady,
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('facture'))).toBe(
      true,
    );
  });

  it('rejects a family shorter than eight or with missing prompt labels', () => {
    const tooShort = validateSynaRecipeDescriptors([
      SYNA_RECIPE_DESCRIPTORS[0]!,
    ]);

    expect(tooShort.valid).toBe(false);
    expect(tooShort.errors.some((error) => error.includes('huit'))).toBe(true);

    const unlabeled: SynaRecipeDescriptor = {
      ...SYNA_RECIPE_DESCRIPTORS[0]!,
      key: 'syna-test-unlabeled',
      prompt: { fr: '', en: '' },
    };

    const validation = validateSynaRecipeDescriptors([
      ...SYNA_RECIPE_DESCRIPTORS,
      unlabeled,
    ]);

    expect(validation.errors.some((error) => error.includes('Prompt'))).toBe(
      true,
    );
  });
});
