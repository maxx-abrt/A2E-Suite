import { pathToFileURL } from 'node:url';

export const deployCoolifyRelease = async ({
  environment = process.env,
  fetchImplementation = fetch,
  wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 90,
} = {}) => {
  const {
    COOLIFY_URL: origin,
    COOLIFY_APPLICATION_UUID: applicationUuid,
    COOLIFY_API_TOKEN: token,
    A2E_RELEASE_IMAGE: image,
    A2E_RELEASE_REVISION: revision,
    GITHUB_REPOSITORY: repository,
  } = environment;
  const url = new URL(origin);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('COOLIFY_URL must be an HTTPS origin');
  }
  if (
    !/^[a-zA-Z0-9_-]+$/.test(applicationUuid ?? '') ||
    !token ||
    /[\r\n]/.test(token)
  ) {
    throw new Error('Missing or invalid Coolify credentials/target');
  }
  if (
    repository !== 'maxx-abrt/A2E-Suite' ||
    !/^[a-f0-9]{40}$/.test(revision ?? '') ||
    !/^ghcr\.io\/maxx-abrt\/a2e-suite@sha256:[a-f0-9]{64}$/.test(image ?? '')
  ) {
    throw new Error('A tested A2E Suite digest and full revision are required');
  }
  const request = async (path, method = 'GET', body) => {
    let response;
    try {
      response = await fetchImplementation(new URL(`/api/v1/${path}`, url), {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error(
        `Coolify ${method} request failed; inspect the target before retrying`,
      );
    }
    // Responses can contain secrets and full build logs, including on failure.
    if (!response.ok)
      throw new Error(`Coolify ${method} returned HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new Error('Coolify returned a non-JSON response');
    }
  };
  const applicationPath = `applications/${applicationUuid}`;
  const application = await request(applicationPath);
  if (
    application.uuid !== applicationUuid ||
    application.git_repository !== repository ||
    application.git_branch !== 'main' ||
    application.build_pack !== 'dockercompose'
  ) {
    throw new Error(
      'Target is not the expected A2E Suite main Compose application',
    );
  }
  await request(`${applicationPath}/envs/bulk`, 'PATCH', {
    data: [
      {
        key: 'A2E_IMAGE',
        value: image,
        is_preview: false,
        is_literal: true,
        is_runtime: true,
        is_buildtime: true,
      },
    ],
  });
  // Pin Compose and image to one release; a later merge must not change this deployment's configuration.
  await request(applicationPath, 'PATCH', {
    git_commit_sha: revision,
    is_auto_deploy_enabled: false,
  });
  const queued = await request('deploy', 'POST', {
    uuid: applicationUuid,
    force: false,
  });
  const deployments = queued.deployments;
  if (
    !Array.isArray(deployments) ||
    deployments.length !== 1 ||
    deployments[0].resource_uuid !== applicationUuid ||
    !/^[a-zA-Z0-9_-]+$/.test(deployments[0].deployment_uuid ?? '')
  ) {
    throw new Error(
      'Coolify did not acknowledge exactly one deployment for the expected application',
    );
  }
  const deploymentUuid = deployments[0].deployment_uuid;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const deployment = await request(`deployments/${deploymentUuid}`);
    if (deployment.status === 'finished')
      return { applicationUuid, deploymentUuid, image, revision };
    if (['failed', 'cancelled', 'canceled'].includes(deployment.status)) {
      throw new Error(
        `Coolify deployment ${deploymentUuid} ${deployment.status}`,
      );
    }
    if (attempt < attempts - 1) await wait(20000);
  }
  throw new Error(
    `Coolify deployment ${deploymentUuid} did not finish within the polling window; inspect before retrying`,
  );
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(JSON.stringify(await deployCoolifyRelease()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
