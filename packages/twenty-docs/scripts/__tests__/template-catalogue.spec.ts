import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { formatTemplateCataloguePage } from '../generate-template-catalogue';
import { collectTemplateCatalogueEntries } from '../template-catalogue/collect-template-catalogue';
import {
  type TemplateCatalogueLocale,
  getTemplateCataloguePagePath,
  renderTemplateCatalogue,
} from '../template-catalogue/render-template-catalogue';

const CATALOGUE_LOCALES: TemplateCatalogueLocale[] = ['en', 'fr'];

describe('renderTemplateCatalogue', () => {
  it('produces the same page for the same descriptors', () => {
    const entries = collectTemplateCatalogueEntries();

    expect(renderTemplateCatalogue(entries, 'en')).toBe(
      renderTemplateCatalogue(entries, 'en'),
    );
  });

  it('renders every collected descriptor key and its app', () => {
    const entries = collectTemplateCatalogueEntries();
    const page = renderTemplateCatalogue(entries, 'en');

    for (const { applicationName, descriptor } of entries) {
      expect(page).toContain(`\`${descriptor.key}\``);
      expect(page).toContain(applicationName);
    }
  });
});

describe('committed catalogue pages', () => {
  it.each(CATALOGUE_LOCALES)('match regeneration (%s)', async (locale) => {
    const entries = collectTemplateCatalogueEntries();
    const pagePath = getTemplateCataloguePagePath(locale);

    const expected = await formatTemplateCataloguePage(
      renderTemplateCatalogue(entries, locale),
      pagePath,
    );

    expect(fs.readFileSync(pagePath, 'utf8')).toBe(expected);
  });
});
