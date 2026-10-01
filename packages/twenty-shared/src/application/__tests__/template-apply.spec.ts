import {
  isTemplateApplyResult,
  resolveTemplateApplyRequestError,
} from '@/application/templateApplyGuards';
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
  inputs: [],
  ...overrides,
});

const noInstalledApps = { names: [], universalIdentifiers: [] };

describe('isTemplateApplyResult', () => {
  it('accepts an applied result with created records', () => {
    expect(
      isTemplateApplyResult({
        status: 'applied',
        key: 'note-reunion',
        version: 1,
        operationId: null,
        created: [{ object: 'document', id: 'doc-1' }],
      }),
    ).toBe(true);
  });

  it('accepts a rejected result with a typed error code', () => {
    expect(
      isTemplateApplyResult({
        status: 'rejected',
        key: 'inconnu',
        errorCode: 'UNKNOWN_TEMPLATE_KEY',
        message: 'Modèle inconnu.',
      }),
    ).toBe(true);
  });

  it('rejects an unknown error code or a malformed created row', () => {
    expect(
      isTemplateApplyResult({
        status: 'rejected',
        key: 'note-reunion',
        errorCode: 'BOOM',
        message: 'x',
      }),
    ).toBe(false);
    expect(
      isTemplateApplyResult({
        status: 'applied',
        key: 'note-reunion',
        version: 1,
        operationId: null,
        created: [{ object: 'document', id: '' }],
      }),
    ).toBe(false);
  });
});

describe('resolveTemplateApplyRequestError', () => {
  it('accepts a descriptor whose required apps are all installed', () => {
    expect(
      resolveTemplateApplyRequestError({
        descriptor: buildDescriptor({ requiredApps: ['a2e-accounting'] }),
        installedApplications: {
          names: ['a2e-accounting'],
          universalIdentifiers: [],
        },
        inputs: {},
      }),
    ).toBeNull();
  });

  it('matches a required app by universal identifier too', () => {
    expect(
      resolveTemplateApplyRequestError({
        descriptor: buildDescriptor({ requiredApps: ['uid-accounting'] }),
        installedApplications: {
          names: [],
          universalIdentifiers: ['uid-accounting'],
        },
        inputs: {},
      }),
    ).toBeNull();
  });

  it('rejects a missing required app with a typed error', () => {
    const rejection = resolveTemplateApplyRequestError({
      descriptor: buildDescriptor({ requiredApps: ['a2e-accounting'] }),
      installedApplications: noInstalledApps,
      inputs: {},
    });

    expect(rejection?.errorCode).toBe('MISSING_REQUIRED_APP');
  });

  it('rejects a missing required input with a typed error', () => {
    const rejection = resolveTemplateApplyRequestError({
      descriptor: buildDescriptor({
        inputs: [
          {
            key: 'equipe',
            label: { fr: 'Équipe', en: 'Team' },
            required: true,
          },
        ],
      }),
      installedApplications: noInstalledApps,
      inputs: { equipe: '   ' },
    });

    expect(rejection?.errorCode).toBe('MISSING_INPUT');
  });

  it('does not require an optional input', () => {
    expect(
      resolveTemplateApplyRequestError({
        descriptor: buildDescriptor({
          inputs: [
            {
              key: 'equipe',
              label: { fr: 'Équipe', en: 'Team' },
              required: false,
            },
          ],
        }),
        installedApplications: noInstalledApps,
        inputs: {},
      }),
    ).toBeNull();
  });
});
