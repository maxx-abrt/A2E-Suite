import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const OTHER_WORKSPACE_ID = '30303030-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';

const buildAccessToken = (overrides: Record<string, unknown> = {}) => ({
  sub: USER_ID,
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  userWorkspaceId: '20202020-1e7c-43d9-a5db-685b506d816',
  type: JwtTokenTypeEnum.ACCESS,
  authProvider: 'password',
  ...overrides,
});

const buildSocketContext = (
  overrides: Partial<
    Parameters<RealtimeTopicAuthorizationService['assertTopicAuthorized']>[0]
  > = {},
) => ({
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  isWorkspaceAgnostic: false,
  ...overrides,
});

const createService = () => new RealtimeTopicAuthorizationService({} as never);

describe('RealtimeTopicAuthorizationService', () => {
  describe('authenticate', () => {
    it('throws when no token is provided', async () => {
      const service = createService();

      await expect(service.authenticate(undefined)).rejects.toThrow(
        'Missing realtime auth token',
      );
    });

    it('resolves an access token to its workspace context', async () => {
      const payload = buildAccessToken();
      const service = new RealtimeTopicAuthorizationService({
        verifyJwtToken: jest.fn().mockResolvedValue(payload),
      } as never);

      const context = await service.authenticate('token');

      expect(context).toEqual({
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        isWorkspaceAgnostic: false,
      });
    });

    it('resolves a workspace-agnostic token without a workspace binding', async () => {
      const service = new RealtimeTopicAuthorizationService({
        verifyJwtToken: jest.fn().mockResolvedValue({
          sub: USER_ID,
          userId: USER_ID,
          type: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC,
          authProvider: 'password',
        }),
      } as never);

      const context = await service.authenticate('token');

      expect(context.isWorkspaceAgnostic).toBe(true);
      expect(context.workspaceId).toBe('');
    });

    it('propagates verification failures', async () => {
      const service = new RealtimeTopicAuthorizationService({
        verifyJwtToken: jest
          .fn()
          .mockRejectedValue(new Error('Token invalid.')),
      } as never);

      await expect(service.authenticate('bad')).rejects.toThrow(
        'Token invalid.',
      );
    });
  });

  describe('assertTopicAuthorized', () => {
    it('accepts a workspace topic of the authenticated workspace', () => {
      const service = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).not.toThrow();
    });

    it('rejects a topic of another workspace', () => {
      const service = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${OTHER_WORKSPACE_ID}`,
        ),
      ).toThrow('Topic workspace does not match the authenticated one');
    });

    it('rejects invalid topic shapes', () => {
      const service = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          'workspace:not-a-uuid',
        ),
      ).toThrow();
      expect(() =>
        service.assertTopicAuthorized(buildSocketContext(), 'other:thing'),
      ).toThrow();
      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:object`,
        ),
      ).toThrow();
    });

    it('rejects another user inbox topic but allows the own one', () => {
      const service = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:${USER_ID}`,
        ),
      ).not.toThrow();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:someone-else`,
        ),
      ).toThrow('Inbox topics are scoped to the owning user');
    });

    it('rejects everything for workspace-agnostic sockets', () => {
      const service = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext({ isWorkspaceAgnostic: true }),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).toThrow('Workspace-agnostic tokens cannot subscribe to topics');
    });
  });
});
