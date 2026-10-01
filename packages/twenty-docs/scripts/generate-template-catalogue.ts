import fs from 'node:fs';

import { format } from 'prettier';

import { collectTemplateCatalogueEntries } from './template-catalogue/collect-template-catalogue';
import {
  type TemplateCatalogueLocale,
  getTemplateCataloguePagePath,
  renderTemplateCatalogue,
} from './template-catalogue/render-template-catalogue';

const CATALOGUE_LOCALES: TemplateCatalogueLocale[] = ['en', 'fr'];

// The committed page is Prettier-formatted so the package-wide `fmt` target
// stays green; the steady state is therefore "render → format → write", and the
// drift test asserts the committed file equals exactly this.
export const formatTemplateCataloguePage = (
  content: string,
  pagePath: string,
): Promise<string> => format(content, { filepath: pagePath });

export const generateTemplateCatalogue = async (): Promise<string[]> => {
  const entries = collectTemplateCatalogueEntries();

  const writtenPaths: string[] = [];

  for (const locale of CATALOGUE_LOCALES) {
    const pagePath = getTemplateCataloguePagePath(locale);
    const formatted = await formatTemplateCataloguePage(
      renderTemplateCatalogue(entries, locale),
      pagePath,
    );

    fs.writeFileSync(pagePath, formatted);
    writtenPaths.push(pagePath);
  }

  return writtenPaths;
};

if (require.main === module) {
  generateTemplateCatalogue()
    .then((writtenPaths) => {
      console.log(
        `Generated ${writtenPaths.length} template catalogue page(s):`,
      );
      writtenPaths.forEach((writtenPath) => console.log(`  ${writtenPath}`));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
