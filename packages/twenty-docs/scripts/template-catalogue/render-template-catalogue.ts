import path from 'node:path';

import {
  type TemplateDescriptor,
  type TemplateDescriptorCategory,
  type TemplateDescriptorLabels,
} from 'twenty-shared/application';

import { type TemplateCatalogueEntry } from './collect-template-catalogue';

export type TemplateCatalogueLocale = 'en' | 'fr';

// Output locations, relative to the `twenty-docs` package root. The pages
// overwrite the M12a stubs, so the M12a navigation wiring (docs.json) stays
// untouched.
export const TEMPLATE_CATALOGUE_PAGE_PATHS: Record<
  TemplateCatalogueLocale,
  string
> = {
  en: 'user-guide/a2e-suite/templates.mdx',
  fr: 'l/fr/user-guide/a2e-suite/templates.mdx',
};

export const getTemplateCataloguePagePath = (
  locale: TemplateCatalogueLocale,
): string =>
  path.resolve(__dirname, '../..', TEMPLATE_CATALOGUE_PAGE_PATHS[locale]);

// A descriptor's category is a display grouping, not an app identity — this is
// the order the M9c-era gallery groups them in.
const CATEGORY_ORDER: TemplateDescriptorCategory[] = [
  'Pages',
  'Projets',
  'Bilan',
  'Archive',
  'Agenda',
  'Syna',
  'Automatisations',
];

const CATEGORY_LABELS: Record<
  TemplateDescriptorCategory,
  TemplateDescriptorLabels
> = {
  Pages: { en: 'Pages', fr: 'Pages' },
  Projets: { en: 'Projects', fr: 'Projets' },
  Bilan: { en: 'Bilan', fr: 'Bilan' },
  Archive: { en: 'Archive', fr: 'Archive' },
  Agenda: { en: 'Agenda', fr: 'Agenda' },
  Syna: { en: 'Syna', fr: 'Syna' },
  Automatisations: { en: 'Automations', fr: 'Automatisations' },
};

type CatalogueCopy = {
  title: string;
  description: string;
  versionLabel: string;
  versionLine: string;
  generatedNotice: string;
  intro: string;
  columns: {
    template: string;
    application: string;
    creates: string;
    inputs: string;
    screenshot: string;
  };
  noWrites: string;
  noInputs: string;
  screenshotPending: string;
};

const COPY: Record<TemplateCatalogueLocale, CatalogueCopy> = {
  en: {
    title: 'Templates',
    description:
      'Every template the A2E Suite ships, generated from the real descriptors.',
    versionLabel: 'Version documented:',
    versionLine: 'A2E Suite 0.2.1 · Twenty 2.39.0',
    generatedNotice:
      'Generated from the C1 `TemplateDescriptor`s — do not edit by hand. Run `yarn docs:generate-template-catalogue` to regenerate.',
    intro:
      'This catalogue is rendered from the descriptors the apps and host surfaces ship, so it lists exactly what the product contains: the template, the app that ships it, what applying it creates, and the inputs it asks for. Screenshots are captured from the running app and are pending (Tier-2).',
    columns: {
      template: 'Template',
      application: 'App',
      creates: 'What it creates',
      inputs: 'Inputs',
      screenshot: 'Screenshot',
    },
    noWrites: 'No writes are declared.',
    noInputs: 'None',
    screenshotPending: 'Pending (Tier-2)',
  },
  fr: {
    title: 'Modèles',
    description:
      'Tous les modèles livrés par la Suite A2E, générés depuis les descripteurs réels.',
    versionLabel: 'Version documentée :',
    versionLine: 'Suite A2E 0.2.1 · Twenty 2.39.0',
    generatedNotice:
      'Généré depuis les `TemplateDescriptor` C1 — ne pas modifier à la main. Lancer `yarn docs:generate-template-catalogue` pour régénérer.',
    intro:
      'Ce catalogue est produit à partir des descripteurs livrés par les apps et les surfaces hôtes : il liste exactement ce que contient le produit — le modèle, l’app qui le livre, ce que son application crée et les entrées demandées. Les captures proviennent de l’app en fonctionnement et sont à venir (Tier-2).',
    columns: {
      template: 'Modèle',
      application: 'App',
      creates: 'Ce qu’il crée',
      inputs: 'Entrées',
      screenshot: 'Capture',
    },
    noWrites: 'Aucune écriture déclarée.',
    noInputs: 'Aucune',
    screenshotPending: 'À venir (Tier-2)',
  },
};

// A `|` in user-facing text would split a Markdown table cell, so it is escaped
// rather than dropped.
const escapeTableCell = (value: string): string =>
  value.replace(/\|/g, '\\|').replace(/\n+/g, ' ');

const renderCreates = (
  descriptor: TemplateDescriptor,
  locale: TemplateCatalogueLocale,
  copy: CatalogueCopy,
): string => {
  const writes = descriptor.preview;

  if (writes.length === 0) {
    return copy.noWrites;
  }

  return writes
    .map(
      (write) => `${write.summary[locale]} (${write.object} ×${write.count})`,
    )
    .join('; ');
};

const renderInputs = (
  descriptor: TemplateDescriptor,
  locale: TemplateCatalogueLocale,
  copy: CatalogueCopy,
): string => {
  if (descriptor.inputs.length === 0) {
    return copy.noInputs;
  }

  return descriptor.inputs.map((input) => input.label[locale]).join('; ');
};

const renderRow = (
  entry: TemplateCatalogueEntry,
  locale: TemplateCatalogueLocale,
  copy: CatalogueCopy,
): string => {
  const { descriptor } = entry;
  const cells = [
    `${escapeTableCell(descriptor.labels[locale])} (\`${descriptor.key}\`)`,
    escapeTableCell(entry.applicationName),
    escapeTableCell(renderCreates(descriptor, locale, copy)),
    escapeTableCell(renderInputs(descriptor, locale, copy)),
    copy.screenshotPending,
  ];

  return `| ${cells.join(' | ')} |`;
};

// Code-unit comparison, not `localeCompare`: the rendered order must not depend
// on the machine's default locale.
const compareStrings = (first: string, second: string): number => {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
};

const compareEntries = (
  firstEntry: TemplateCatalogueEntry,
  secondEntry: TemplateCatalogueEntry,
): number => {
  const categoryDelta =
    CATEGORY_ORDER.indexOf(firstEntry.descriptor.category) -
    CATEGORY_ORDER.indexOf(secondEntry.descriptor.category);

  if (categoryDelta !== 0) {
    return categoryDelta;
  }

  const applicationDelta = compareStrings(
    firstEntry.applicationName,
    secondEntry.applicationName,
  );

  if (applicationDelta !== 0) {
    return applicationDelta;
  }

  return compareStrings(firstEntry.descriptor.key, secondEntry.descriptor.key);
};

// Deterministic: same descriptors in, same MDX out. The generator and the drift
// test share this function, so a hand-edited page can never silently diverge.
export const renderTemplateCatalogue = (
  entries: TemplateCatalogueEntry[],
  locale: TemplateCatalogueLocale,
): string => {
  const copy = COPY[locale];
  const sortedEntries = [...entries].sort(compareEntries);

  const sections = CATEGORY_ORDER.map((category) => ({
    category,
    entries: sortedEntries.filter(
      (entry) => entry.descriptor.category === category,
    ),
  })).filter((section) => section.entries.length > 0);

  const body = sections.flatMap(({ category, entries: sectionEntries }) => {
    const header = `| ${copy.columns.template} | ${copy.columns.application} | ${copy.columns.creates} | ${copy.columns.inputs} | ${copy.columns.screenshot} |`;
    const separator = '| --- | --- | --- | --- | --- |';
    const rows = sectionEntries.map((entry) => renderRow(entry, locale, copy));

    return [
      `## ${CATEGORY_LABELS[category][locale]}`,
      '',
      header,
      separator,
      ...rows,
      '',
    ];
  });

  return [
    '---',
    `title: ${copy.title}`,
    `description: ${copy.description}`,
    '---',
    '',
    `> **${copy.versionLabel}** ${copy.versionLine}.`,
    '>',
    `> ${copy.generatedNotice}`,
    '',
    copy.intro,
    '',
    ...body,
  ]
    .join('\n')
    .replace(/\n+$/, '\n');
};
