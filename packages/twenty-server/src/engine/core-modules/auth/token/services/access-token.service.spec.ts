import { type Request } from 'express';

import { AuthExceptionCode } from 'src/engine/core-modules/auth/auth.exception';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';

import { AccessTokenService } from './access-token.service';

describe('AccessTokenService request workspace binding', () => {
  const workspaceId = '20202020-1c25-4d02-bf25-6aeccf7ea419';
  const otherWorkspaceId = '20202020-9e3b-46d4-a556-88b9ddc9a8b5';
  const context: AuthContext = {
    workspace: { id: workspaceId } as NonNullable<AuthContext['workspace']>,
  };
  const payload = { type: JwtTokenTypeEnum.ACCESS };
  const jwtWrapperService = {
    extractJwtFromRequest: jest.fn(),
    verifyJwtToken: jest.fn(),
    decode: jest.fn(),
  };
  const jwtStrategy = { validate: jest.fn() };
  const userSessionService = { resolveSession: jest.fn() };
  const userSessionCookieService = {
    extractSessionTokenFromRequest: jest.fn(),
  };
  const service = new AccessTokenService(
    jwtWrapperService as never,
    jwtStrategy as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    userSessionService as never,
    userSessionCookieService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jwtWrapperService.decode.mockReturnValue(payload);
    jwtStrategy.validate.mockResolvedValue(context);
    userSessionService.resolveSession.mockResolvedValue({
      payload,
      authenticatedAt: new Date('2026-10-22T08:00:00Z'),
    });
  });

  describe.each(['cookie', 'bearer'] as const)(
    '%s authentication',
    (method) => {
      beforeEach(() => {
        jwtWrapperService.extractJwtFromRequest.mockReturnValue(() =>
          method === 'bearer' ? 'signed-token' : null,
        );
        userSessionCookieService.extractSessionTokenFromRequest.mockReturnValue(
          method === 'cookie' ? 'sess_test' : undefined,
        );
      });

      const request = (selector?: string | string[]): Request =>
        ({
          headers: selector === undefined ? {} : { 'x-workspace-id': selector },
        }) as Request;

      it('accepts the authenticated workspace assertion', async () => {
        await expect(
          service.validateTokenByRequest(request(workspaceId)),
        ).resolves.toMatchObject(context);
        expect(jwtStrategy.validate).toHaveBeenCalledWith(payload);
      });

      it('preserves clients that do not send a workspace assertion', async () => {
        await expect(
          service.validateTokenByRequest(request()),
        ).resolves.toMatchObject(context);
      });

      it.each([
        otherWorkspaceId,
        '',
        `${workspaceId}, ${workspaceId}`,
        [workspaceId],
      ])(
        'rejects a mismatched or malformed assertion: %j',
        async (selector) => {
          await expect(
            service.validateTokenByRequest(request(selector)),
          ).rejects.toMatchObject({
            code: AuthExceptionCode.WORKSPACE_CONTEXT_MISMATCH,
          });
        },
      );

      it('does not let an account session acquire workspace access from a header', async () => {
        jwtStrategy.validate.mockResolvedValue({ user: { id: 'user-id' } });

        await expect(
          service.validateTokenByRequest(request(workspaceId)),
        ).rejects.toMatchObject({
          code: AuthExceptionCode.WORKSPACE_CONTEXT_MISMATCH,
        });
      });

      it('preserves authentication failures even when the assertion matches', async () => {
        const authenticationError = new Error('Membership revoked');

        jwtStrategy.validate.mockRejectedValue(authenticationError);

        await expect(
          service.validateTokenByRequest(request(workspaceId)),
        ).rejects.toBe(authenticationError);
      });

      it('checks each request independently after a cookie changes in another tab', async () => {
        await expect(
          service.validateTokenByRequest(request(workspaceId)),
        ).resolves.toMatchObject(context);

        jwtStrategy.validate.mockResolvedValue({
          workspace: { id: otherWorkspaceId },
        });

        await expect(
          service.validateTokenByRequest(request(workspaceId)),
        ).rejects.toMatchObject({
          code: AuthExceptionCode.WORKSPACE_CONTEXT_MISMATCH,
        });
        await expect(
          service.validateTokenByRequest(request(otherWorkspaceId)),
        ).resolves.toMatchObject({ workspace: { id: otherWorkspaceId } });
      });
    },
  );
});
