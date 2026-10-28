import { messages as englishMessages } from '~/locales/generated/en';
import { messages as frenchMessages } from '~/locales/generated/fr-FR';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'glob';
import babelExtractor from '@lingui/cli/api/extractors/babel';
import { makeConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';
import { A2E_DPA_TERMS } from 'twenty-shared/constants';

const packageRoot = resolve(__dirname, '../../../..');
const catalogFormatter = formatter({});
const config = makeConfig({ sourceLocale: 'en', locales: ['en', 'fr-FR'] });

it('translates every public-site and calendar toolbar message in English and French', async () => {
  const messageIds = new Set<string>();
  const filenames = [
    ...globSync('src/modules/public-site/**/*.{ts,tsx}', {
      cwd: packageRoot,
      ignore: ['**/__tests__/**'],
    }),
    'src/modules/calendar/components/CalendarToolbar.tsx',
  ];
  for (const filename of filenames) {
    const absoluteFilename = resolve(packageRoot, filename);
    await babelExtractor.extract(
      absoluteFilename,
      readFileSync(absoluteFilename, 'utf8'),
      ({ id }) => messageIds.add(id),
      { linguiConfig: config },
    );
  }
  for (const block of A2E_DPA_TERMS) messageIds.add(block.text);
  expect(messageIds.size).toBeGreaterThan(450);

  for (const locale of ['en', 'fr-FR']) {
    const filename = resolve(packageRoot, `src/locales/${locale}.po`);
    const catalog = await catalogFormatter.parse(
      readFileSync(filename, 'utf8'),
      {
        locale,
        sourceLocale: 'en',
        filename,
      },
    );
    const missing = [...messageIds].filter(
      (id) => !catalog[id]?.translation || catalog[id]?.obsolete,
    );
    expect({ locale, missing }).toEqual({ locale, missing: [] });
    const compiledMessages = locale === 'en' ? englishMessages : frenchMessages;
    expect(
      [...messageIds].filter((id) => !Object.hasOwn(compiledMessages, id)),
    ).toEqual([]);
  }
});
