import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const createReleaseManifest = ({
  image,
  revision,
  digest,
  version,
  buildId,
  builtAt,
  runUrl,
}) => {
  if (
    !/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(image ?? '') ||
    !/^[a-f0-9]{40}$/.test(revision ?? '') ||
    !/^sha256:[a-f0-9]{64}$/.test(digest ?? '') ||
    !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(version ?? '') ||
    !/^[1-9]\d*\.[1-9]\d*$/.test(buildId ?? '') ||
    !/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/actions\/runs\/[1-9]\d*$/.test(
      runUrl ?? '',
    ) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(builtAt ?? '') ||
    !Number.isFinite(Date.parse(builtAt))
  )
    throw new Error(
      'A tested image requires valid registry, revision, digest, version, build identity, timestamp and workflow URL',
    );

  return {
    artifactFormat: 1,
    version,
    buildId,
    revision,
    builtAt,
    image: `${image}@${digest}`,
    runUrl,
    candidateVerified: true,
    liveDeploymentVerified: false,
  };
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const manifest = createReleaseManifest({
    image: process.env.IMAGE,
    revision: process.env.RELEASE_REVISION,
    digest: process.env.RELEASE_DIGEST,
    version: process.env.RELEASE_VERSION,
    buildId: process.env.RELEASE_BUILD_ID,
    builtAt: process.env.RELEASE_BUILT_AT,
    runUrl: process.env.RELEASE_RUN_URL,
  });
  mkdirSync(process.env.A2E_SMOKE_REPORT_DIR, { recursive: true });
  writeFileSync(
    join(process.env.A2E_SMOKE_REPORT_DIR, 'release.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  if (process.env.GITHUB_STEP_SUMMARY)
    writeFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Tested A2E image\n\nVersion: ${manifest.version} · build ${manifest.buildId}\n\nRevision: ${manifest.revision}\n\nCoolify immutable reference:\n\n\`A2E_IMAGE=${manifest.image}\`\n\nCandidate checks passed. Live deployment is verified separately.\n`,
      { flag: 'a' },
    );
}
