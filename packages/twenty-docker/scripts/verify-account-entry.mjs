import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const verifyAccountEntry = async ({
  url,
  revision,
  buildId,
  fetchResponse = fetch,
}) => {
  if (!/^[a-f0-9]{40}$/.test(revision ?? '')) {
    throw new Error('Pass the full tested Git commit SHA as --revision');
  }
  if (buildId !== undefined && !/^[1-9]\d*\.[1-9]\d*$/.test(buildId))
    throw new Error('Pass the expected build number and attempt as --build-id');
  const origin = new URL(url);
  const readJson = async (pathname) => {
    const endpoint = new URL(pathname, origin);
    endpoint.searchParams.set(
      'release-check',
      buildId ? `${revision}-${buildId}` : revision,
    );
    const response = await fetchResponse(endpoint, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`${pathname}: HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new Error(
        `${pathname} is not JSON; the server may still be serving an old SPA build`,
      );
    }
  };
  const [configuration, frontendRelease, readiness] = await Promise.all([
    readJson('/client-config'),
    readJson('/release.json'),
    readJson('/readyz'),
  ]);
  const problems = [];
  if (
    readiness.status !== 'ok' ||
    readiness.details?.database?.status !== 'up' ||
    readiness.details?.redis?.status !== 'up'
  )
    problems.push(
      'Server readiness must confirm healthy database and Redis connections',
    );
  if (configuration.appRevision !== revision)
    problems.push(
      `Backend revision is ${configuration.appRevision ?? 'missing'}, expected ${revision}`,
    );
  if (frontendRelease.revision !== revision)
    problems.push(
      `Frontend revision is ${frontendRelease.revision ?? 'missing'}, expected ${revision}`,
    );
  const backendBuild = configuration.appBuildId || undefined;
  const frontendBuild = frontendRelease.buildId || undefined;
  const backendVersion = configuration.appVersion || undefined;
  const frontendVersion = frontendRelease.version || undefined;
  const backendBuiltAt = configuration.appBuiltAt || undefined;
  const frontendBuiltAt = frontendRelease.builtAt || undefined;
  if (backendBuild !== frontendBuild)
    problems.push('Frontend and backend build identities differ');
  if ((frontendVersion || buildId) && backendVersion !== frontendVersion)
    problems.push('Frontend and backend application versions differ');
  if (buildId !== undefined && backendBuild !== buildId)
    problems.push(
      `Running build is ${configuration.appBuildId ?? 'missing'}, expected ${buildId}`,
    );
  if (backendBuiltAt !== frontendBuiltAt)
    problems.push('Frontend and backend build timestamps differ');
  if (
    buildId &&
    (!backendVersion ||
      !backendBuiltAt ||
      !Number.isFinite(Date.parse(backendBuiltAt)))
  )
    problems.push(
      'Build metadata must include the application version and a valid timestamp',
    );
  if (frontendRelease.accountEntry !== 'shared-domain')
    problems.push('Frontend does not declare the shared-domain account entry');
  if (
    configuration.isSharedDomainWorkspaceEnabled !== true ||
    configuration.isMultiWorkspaceEnabled !== true
  )
    problems.push('Shared-domain account/workspace mode is not enabled');
  if (configuration.frontDomain !== origin.hostname)
    problems.push(
      `Configured frontend host is ${configuration.frontDomain}, requested ${origin.hostname}`,
    );
  if (problems.length) throw new Error(problems.join('\n'));
  return { origin: origin.origin, revision, ...(buildId ? { buildId } : {}) };
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const readArgument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
  };
  try {
    const result = await verifyAccountEntry({
      url: readArgument('--url'),
      revision: readArgument('--revision'),
      buildId: readArgument('--build-id'),
    });
    console.log(
      `Verified deployed backend/frontend revision and shared account mode: ${result.origin} ${result.revision}`,
    );
    console.log(
      'Run the signed-out landing and two-account browser journeys before accepting the release.',
    );
  } catch (error) {
    console.error(`Account-entry release check failed:\n${error.message}`);
    process.exitCode = 1;
  }
}
