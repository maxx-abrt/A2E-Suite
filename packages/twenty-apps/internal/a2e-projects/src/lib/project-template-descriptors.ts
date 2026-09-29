import { type TemplateDescriptor } from 'twenty-shared/application';

import { STARTER_PROJECT_TEMPLATES } from './starter-projects.ts';

// C1 descriptor registry (PLAN M9a / US-117).
//
// The gallery (M9a-2) and the presets (M9d) read templates through ONE contract;
// this module projects the app's existing lib constants onto it — it does not
// duplicate the content. The `key` is the project's existing stable delta key
// (`LIV`, `SPR`, …), the fr label is the curated project name and the en label
// is the gallery's English surface. The preview lists the project plus the task
// and milestone rows the apply writes, so the gallery can show them before
// anything is created. Inputs stay empty: a project template has no
// user-filled field at apply time.

export const PROJECTS_TEMPLATE_CATEGORY = 'Projets';

// The app itself owns `project`, `task` and `milestone`, so no sibling app is
// required.
export const PROJECTS_REQUIRED_APPS: string[] = [];

// English labels are curated by key, not machine-translated: a starter with no
// entry here falls back to its French name, which keeps the contract valid
// (fr+en non-empty) without inventing a translation at runtime.
const PROJECT_TEMPLATE_EN_LABELS: Record<string, string> = {
  LIV: 'Project delivery',
  EVT: 'Event retroplanning',
  SPR: 'Sprint board',
  CNT: 'Content calendar',
  REC: 'Hiring pipeline',
  ONB: 'Client onboarding',
  WEB: 'Website redesign',
  SEM: 'Student semester',
  AGA: 'Annual general meeting',
  SUB: 'Grant application',
  BUG: 'Bug tracker',
  OBJ: 'Personal goals',
};

export const buildProjectTemplateDescriptors = (): TemplateDescriptor[] =>
  STARTER_PROJECT_TEMPLATES.map((starterProject) => {
    const preview: TemplateDescriptor['preview'] = [
      {
        object: 'project',
        summary: {
          fr: 'Crée le projet nommé d’après le modèle.',
          en: 'Creates the project named after the template.',
        },
        count: 1,
      },
    ];

    // Only declare writes that actually happen: a template with no milestone
    // must not preview one (the guard rejects a zero count).
    if (starterProject.tasks.length > 0) {
      preview.push({
        object: 'task',
        summary: {
          fr: 'Crée les tâches de démarrage sur le tableau.',
          en: 'Creates the starter tasks on the board.',
        },
        count: starterProject.tasks.length,
      });
    }

    if (starterProject.milestones.length > 0) {
      preview.push({
        object: 'milestone',
        summary: {
          fr: 'Crée les jalons de démarrage sur le calendrier.',
          en: 'Creates the starter milestones on the calendar.',
        },
        count: starterProject.milestones.length,
      });
    }

    return {
      key: starterProject.key,
      version: 1,
      labels: {
        fr: starterProject.name,
        en: PROJECT_TEMPLATE_EN_LABELS[starterProject.key] ?? starterProject.name,
      },
      category: PROJECTS_TEMPLATE_CATEGORY,
      preview,
      requiredApps: PROJECTS_REQUIRED_APPS,
      inputs: [],
    };
  });
