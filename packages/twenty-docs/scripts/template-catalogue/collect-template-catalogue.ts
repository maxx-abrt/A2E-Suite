import fs from 'node:fs';
import path from 'node:path';

import { type TemplateDescriptor } from 'twenty-shared/application';

import { buildFicheTemplateDescriptors } from '../../../twenty-apps/internal/a2e-accounting/src/lib/fiche-template-descriptors';
import { buildFolderStructureDescriptors } from '../../../twenty-apps/internal/a2e-drive/src/lib/folder-structure-descriptors';
import { buildDocumentTemplateDescriptors } from '../../../twenty-apps/internal/a2e-documents/src/lib/document-template-descriptors';
import { buildProjectTemplateDescriptors } from '../../../twenty-apps/internal/a2e-projects/src/lib/project-template-descriptors';
import { HOST_TEMPLATE_DESCRIPTOR_GROUPS } from '../../../twenty-front/src/modules/template-gallery/constants/HostTemplateDescriptorGroups';

// One catalogue row: a C1 descriptor plus the app/surface that ships it. The
// descriptor itself stays pure (C1 §"provenance is added by the consumer"); the
// app name is read from the same places the gallery reads it — the app manifest
// for per-app families, `HOST_TEMPLATE_DESCRIPTOR_GROUPS` for host surfaces.
export type TemplateCatalogueEntry = {
  applicationName: string;
  descriptor: TemplateDescriptor;
};

type PerApplicationTemplateSource = {
  applicationConfigPath: string;
  buildDescriptors: () => TemplateDescriptor[];
};

// The apps that ship built-in templates through the US-117 C1 contract. This is
// the docs-side counterpart of the gallery's runtime discovery of
// `list-template-descriptors` logic functions: the docs build has no workspace,
// so it calls the descriptor builders directly. Adding an app here without the
// builder (or vice versa) is caught by the catalogue drift test.
const PER_APPLICATION_TEMPLATE_SOURCES: PerApplicationTemplateSource[] = [
  {
    applicationConfigPath:
      '../../../twenty-apps/internal/a2e-documents/src/application.config.ts',
    buildDescriptors: buildDocumentTemplateDescriptors,
  },
  {
    applicationConfigPath:
      '../../../twenty-apps/internal/a2e-projects/src/application.config.ts',
    buildDescriptors: buildProjectTemplateDescriptors,
  },
  {
    applicationConfigPath:
      '../../../twenty-apps/internal/a2e-accounting/src/application.config.ts',
    buildDescriptors: buildFicheTemplateDescriptors,
  },
  {
    applicationConfigPath:
      '../../../twenty-apps/internal/a2e-drive/src/application.config.ts',
    buildDescriptors: buildFolderStructureDescriptors,
  },
];

// Importing `application.config.ts` would execute the whole app definition
// graph, so the display name is read as source text. `displayName` is a plain
// single-quoted literal in every A2E manifest; a missing one fails the build
// rather than silently emitting an unnamed row.
const readApplicationDisplayName = (applicationConfigPath: string): string => {
  const absolutePath = path.resolve(__dirname, applicationConfigPath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const match = /displayName:\s*'([^']+)'/.exec(source);

  if (match === null) {
    throw new Error(`No displayName found in ${applicationConfigPath}`);
  }

  return match[1];
};

export const collectTemplateCatalogueEntries = (): TemplateCatalogueEntry[] => {
  const perApplicationEntries = PER_APPLICATION_TEMPLATE_SOURCES.flatMap(
    ({ applicationConfigPath, buildDescriptors }) => {
      const applicationName = readApplicationDisplayName(applicationConfigPath);

      return buildDescriptors().map((descriptor) => ({
        applicationName,
        descriptor,
      }));
    },
  );

  const hostEntries = HOST_TEMPLATE_DESCRIPTOR_GROUPS.flatMap(
    ({ applicationName, templates }) =>
      templates.map((descriptor) => ({ applicationName, descriptor })),
  );

  return [...perApplicationEntries, ...hostEntries];
};
