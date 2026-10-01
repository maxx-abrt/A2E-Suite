import { SYNA_LANDING_TEMPLATE_LINKS } from '@/ai/constants/SynaLandingTemplates';
import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';

describe('SYNA_LANDING_TEMPLATE_LINKS', () => {
  it('should feature exactly three starter templates', () => {
    expect(SYNA_LANDING_TEMPLATE_LINKS).toHaveLength(3);
  });

  it('should resolve every featured key to a READY Syna recipe descriptor', () => {
    SYNA_LANDING_TEMPLATE_LINKS.forEach((templateLink) => {
      const descriptor = findSynaRecipeDescriptor(templateLink.descriptorKey);

      expect(descriptor).toBeDefined();
      expect(descriptor?.category).toBe('Syna');
      expect(descriptor?.status).toBe('READY');
    });
  });

  it('should never feature the P7-gated deferred recipe', () => {
    const featuredKeys = SYNA_LANDING_TEMPLATE_LINKS.map(
      (templateLink) => templateLink.descriptorKey,
    );

    expect(featuredKeys).not.toContain('syna-facture-depuis-temps');
  });

  it('should expose every READY recipe through the actions library', () => {
    const readyRecipeKeys = SYNA_RECIPE_DESCRIPTORS.filter(
      (descriptor) => descriptor.status === 'READY',
    ).map((descriptor) => descriptor.key);

    expect(readyRecipeKeys).toHaveLength(7);
    expect(readyRecipeKeys).not.toContain('syna-facture-depuis-temps');
  });
});
