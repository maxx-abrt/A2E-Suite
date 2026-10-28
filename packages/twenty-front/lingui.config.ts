import babelExtractor from '@lingui/cli/api/extractors/babel';
import { A2E_DPA_TERMS } from 'twenty-shared/constants';
import { defineConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';
import { APP_LOCALES, SOURCE_LOCALE } from 'twenty-shared/translations';

export default defineConfig({
  sourceLocale: SOURCE_LOCALE,
  locales: Object.values(APP_LOCALES),
  pseudoLocale: 'pseudo-en',
  fallbackLocales: {
    'pseudo-en': 'en',
    default: SOURCE_LOCALE,
  },
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
    },
  ],
  extractors: [
    {
      match: babelExtractor.match,
      extract: async (filename, code, onMessageExtracted, context) => {
        await babelExtractor.extract(
          filename,
          code,
          onMessageExtracted,
          context,
        );
        if (!filename.endsWith('/public-site/PublicLegalPage.tsx')) return;
        // The public agreement and acceptance PDF share canonical terms outside src.
        for (const block of A2E_DPA_TERMS) {
          onMessageExtracted({
            id: block.text,
            message: block.text.replace(
              '{{HOSTING_REGION}}',
              '{hostingRegion}',
            ),
            origin: [filename, 1],
          });
        }
      },
    },
  ],
  catalogsMergePath: '<rootDir>/src/locales/generated/{locale}',
  compileNamespace: 'ts',
  format: formatter({ lineNumbers: false, printLinguiId: true }),
});
