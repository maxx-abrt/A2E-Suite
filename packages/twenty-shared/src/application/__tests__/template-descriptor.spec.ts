import {
  isTemplateDescriptor,
  isTemplateDescriptorLabels,
  isTemplateDescriptorPreviewWrite,
  validateTemplateDescriptors,
} from '@/application/templateDescriptorGuards';
import { type TemplateDescriptor } from '@/application/templateDescriptorType';

const buildDescriptor = (
  overrides: Partial<TemplateDescriptor> = {},
): TemplateDescriptor => ({
  key: 'note-reunion',
  version: 1,
  labels: { fr: 'Notes de réunion', en: 'Meeting notes' },
  category: 'Pages',
  preview: [
    {
      object: 'document',
      summary: { fr: 'Crée une page.', en: 'Creates one page.' },
      count: 1,
    },
  ],
  requiredApps: [],
  inputs: [
    {
      key: 'team',
      label: { fr: 'Équipe', en: 'Team' },
      required: false,
    },
  ],
  ...overrides,
});

describe('TemplateDescriptor guards', () => {
  it('accepts a well-formed descriptor', () => {
    expect(isTemplateDescriptor(buildDescriptor())).toBe(true);
  });

  it('rejects a descriptor missing the fr+en label pair', () => {
    expect(
      isTemplateDescriptorLabels({ fr: 'Notes', en: '' }),
    ).toBe(false);
    expect(
      isTemplateDescriptor(
        buildDescriptor({ labels: { fr: 'Notes', en: ' ' } }),
      ),
    ).toBe(false);
  });

  it('rejects a non-positive version', () => {
    expect(isTemplateDescriptor(buildDescriptor({ version: 0 }))).toBe(false);
  });

  it('rejects a preview write with no object or a zero count', () => {
    expect(
      isTemplateDescriptorPreviewWrite({ object: '', summary: {}, count: 1 }),
    ).toBe(false);
    expect(
      isTemplateDescriptor(
        buildDescriptor({
          preview: [
            {
              object: 'document',
              summary: { fr: 'Crée.', en: 'Creates.' },
              count: 0,
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('validateTemplateDescriptors', () => {
  it('reports duplicate keys', () => {
    const result = validateTemplateDescriptors([
      buildDescriptor(),
      buildDescriptor(),
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('dupliquée'))).toBe(
      true,
    );
  });

  it('flags a descriptor that requires itself', () => {
    const result = validateTemplateDescriptors([
      buildDescriptor({ requiredApps: ['note-reunion'] }),
    ]);

    expect(result.valid).toBe(false);
  });

  it('accepts a valid family', () => {
    expect(
      validateTemplateDescriptors([
        buildDescriptor({ key: 'a' }),
        buildDescriptor({ key: 'b' }),
      ]).valid,
    ).toBe(true);
  });
});
