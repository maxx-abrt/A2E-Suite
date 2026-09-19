import {
  type TemplatePreview,
  type TemplatePreviewApp,
} from '@/a2e-workspace/types/apply-template-operation.types';
import {
  resolveTemplatePreview,
  resolveTemplatePreviewApp,
} from '@/a2e-workspace/utils/resolveTemplatePreview';

const buildApp = (
  overrides: Partial<TemplatePreviewApp> = {},
): TemplatePreviewApp => ({
  universalIdentifier: 'app-documents',
  displayName: 'A2E Documents',
  registered: true,
  versionCompatible: true,
  required: true,
  currentlyInstalled: false,
  ...overrides,
});

describe('resolveTemplatePreviewApp', () => {
  it('resolves an available app that is not installed to install', () => {
    expect(resolveTemplatePreviewApp(buildApp(), []).resolution).toBe(
      'install',
    );
  });

  it('resolves an already installed app to keep', () => {
    expect(
      resolveTemplatePreviewApp(buildApp({ currentlyInstalled: true }), [])
        .resolution,
    ).toBe('keep');
  });

  it('resolves an unregistered app to unavailable', () => {
    const resolved = resolveTemplatePreviewApp(
      buildApp({ registered: false }),
      [],
    );

    expect(resolved.resolution).toBe('unavailable');
    expect(resolved.available).toBe(false);
    expect(resolved.registered).toBe(false);
  });

  it('resolves a version-incompatible app to unavailable', () => {
    const resolved = resolveTemplatePreviewApp(
      buildApp({ versionCompatible: false }),
      [],
    );

    expect(resolved.resolution).toBe('unavailable');
    expect(resolved.available).toBe(false);
    expect(resolved.versionCompatible).toBe(false);
  });

  it('marks a deselected optional app as excluded but still resolvable', () => {
    const resolved = resolveTemplatePreviewApp(
      buildApp({
        universalIdentifier: 'app-accounting',
        required: false,
        currentlyInstalled: false,
      }),
      ['app-accounting'],
    );

    expect(resolved.excluded).toBe(true);
    expect(resolved.resolution).toBe('install');
    expect(resolved.optional).toBe(true);
  });

  it('never excludes a required app even when listed as deselected', () => {
    const resolved = resolveTemplatePreviewApp(buildApp(), ['app-documents']);

    expect(resolved.excluded).toBe(false);
    expect(resolved.optional).toBe(false);
  });
});

describe('resolveTemplatePreview', () => {
  const preview: TemplatePreview = {
    templateKey: 'INDIVIDUAL',
    version: 1,
    apps: [
      buildApp({
        universalIdentifier: 'app-documents',
        displayName: 'A2E Documents',
        required: true,
        currentlyInstalled: false,
      }),
      buildApp({
        universalIdentifier: 'app-accounting',
        displayName: 'A2E Accounting',
        required: false,
        currentlyInstalled: false,
      }),
      buildApp({
        universalIdentifier: 'app-projects',
        displayName: 'A2E Projects',
        required: false,
        currentlyInstalled: true,
      }),
      buildApp({
        universalIdentifier: 'app-missing',
        displayName: 'Missing App',
        required: true,
        registered: false,
      }),
    ],
    navigationChanges: [
      { universalIdentifier: 'nav-people', action: 'hide' },
      { universalIdentifier: 'nav-notes', action: 'restore' },
    ],
    samples: [{ label: 'Welcome note', locale: 'en' }],
    blockedSamples: [
      {
        label: 'Trésorerie',
        locale: 'fr',
        blockedBy: 'P7.0_SAFETY_GATE',
      },
    ],
    blocked: true,
  };

  it('resolves app states, prerequisites, samples and customization', () => {
    const resolved = resolveTemplatePreview(preview, ['app-accounting']);

    expect(resolved.apps.map((app) => app.resolution)).toEqual([
      'install',
      'install',
      'keep',
      'unavailable',
    ]);
    expect(resolved.apps[1].excluded).toBe(true);
    expect(resolved.prerequisites).toHaveLength(1);
    expect(resolved.prerequisites[0].universalIdentifier).toBe('app-missing');
    expect(resolved.navigationChanges).toEqual(preview.navigationChanges);
    expect(resolved.samples).toEqual(preview.samples);
    expect(resolved.blockedSamples).toEqual(preview.blockedSamples);
    expect(resolved.blocked).toBe(true);
  });

  it('does not treat an unavailable optional app as a blocking prerequisite', () => {
    const optionalUnavailable: TemplatePreview = {
      ...preview,
      apps: [
        buildApp({ universalIdentifier: 'app-documents' }),
        buildApp({
          universalIdentifier: 'app-accounting',
          required: false,
          registered: false,
        }),
      ],
      blocked: false,
    };

    const resolved = resolveTemplatePreview(optionalUnavailable, []);

    expect(resolved.prerequisites).toHaveLength(0);
    expect(resolved.blocked).toBe(false);
    expect(resolved.apps[1].resolution).toBe('unavailable');
    expect(resolved.apps[1].required).toBe(false);
  });
});
