import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const writeFrontendRelease = (directory, revision) => {
  if (!existsSync(join(directory, 'index.html'))) {
    throw new Error('Frontend build has no index.html');
  }
  writeFileSync(
    join(directory, 'release.json'),
    JSON.stringify({
      revision,
      accountEntry: 'shared-domain',
      artifactFormat: 1,
    }) + '\n',
  );
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  writeFrontendRelease(
    resolve(process.argv[2]),
    process.env.APP_REVISION ?? 'unknown',
  );
}
