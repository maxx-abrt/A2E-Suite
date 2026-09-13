import { createServer, type Server } from 'node:http';

import { isDefined } from 'twenty-shared/utils';

import { ReadinessService } from 'src/engine/core-modules/health/services/readiness.service';

const WORKER_HEALTH_DEFAULT_PORT = 3099;

// The queue worker has no HTTP layer (createApplicationContext), but container
// orchestration still needs a probe: process liveness plus real dependency
// readiness shared with the server's /readyz.
export const startWorkerHealthServer = ({
  readinessService,
}: {
  readinessService: ReadinessService;
}): Server => {
  const healthPort = isDefined(process.env.WORKER_HEALTH_PORT)
    ? parseInt(process.env.WORKER_HEALTH_PORT, 10)
    : WORKER_HEALTH_DEFAULT_PORT;

  const server = createServer((request, response) => {
    const isReadinessProbe = request.url?.startsWith('/readyz') ?? false;

    if (!isReadinessProbe) {
      response.writeHead(200).end('OK');

      return;
    }

    void readinessService.isReady().then((isReady) => {
      response
        .writeHead(isReady ? 200 : 503, { 'Content-Type': 'text/plain' })
        .end(isReady ? 'READY' : 'NOT_READY');
    });
  });

  server.listen(healthPort);

  return server;
};
