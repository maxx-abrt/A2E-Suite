import type { HttpAdapterHost } from '@nestjs/core';

import { PresenceService } from 'src/engine/core-modules/realtime-gateway/services/presence.service';
import { RealtimeGatewayService } from 'src/engine/core-modules/realtime-gateway/services/realtime-gateway.service';
import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';

const createService = (httpAdapter: unknown) =>
  new RealtimeGatewayService(
    { httpAdapter } as HttpAdapterHost,
    {} as RealtimeTopicAuthorizationService,
    {} as RealtimePublisherService,
    {} as PresenceService,
    {} as UserSessionCookieService,
    {} as TwentyConfigService,
  );

describe('RealtimeGatewayService', () => {
  describe('onModuleInit', () => {
    it('does not throw when no HTTP adapter exists (CLI / worker contexts)', () => {
      const service = createService(null);

      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('does not throw when the adapter has no HTTP server yet', () => {
      const service = createService({ getHttpServer: () => null });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });
});
