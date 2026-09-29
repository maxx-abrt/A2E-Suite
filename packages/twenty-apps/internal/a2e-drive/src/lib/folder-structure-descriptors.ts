import { type TemplateDescriptor } from 'twenty-shared/application';

import {
  FOLDER_STRUCTURE_CATEGORY,
  FOLDER_STRUCTURE_TEMPLATES,
  flattenFolderStructureTemplate,
} from './folder-structure-templates.ts';

// C1 descriptor registry (PLAN M9a / US-117).
//
// The gallery (M9a-2) and the presets (M9d) read templates through ONE contract;
// this module projects the app's existing lib constants onto it — it does not
// duplicate the content. The `key` is the folder structure's existing stable
// delta key, the labels are the ones already curated in fr+en and the preview
// declares the exact number of `driveFolder` rows the apply creates (the tree's
// flattened length), so the gallery can show the size before anything is
// written. A folder structure never creates an attachment or file record, so
// the preview names `driveFolder` only.

export const ARCHIVE_TEMPLATE_CATEGORY = FOLDER_STRUCTURE_CATEGORY;

export const buildFolderStructureDescriptors = (): TemplateDescriptor[] =>
  FOLDER_STRUCTURE_TEMPLATES.map((folderStructure) => ({
    key: folderStructure.key,
    version: folderStructure.version,
    labels: {
      fr: folderStructure.labels.fr,
      en: folderStructure.labels.en,
    },
    category: ARCHIVE_TEMPLATE_CATEGORY,
    preview: [
      {
        object: 'driveFolder',
        summary: {
          fr: 'Crée l’arborescence de dossiers (dossiers uniquement).',
          en: 'Creates the folder tree (folders only).',
        },
        count: flattenFolderStructureTemplate(folderStructure).length,
      },
    ],
    requiredApps: folderStructure.requiredApps,
    inputs: [],
  }));
