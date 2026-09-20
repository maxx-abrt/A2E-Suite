import { getWorkspaceTemplateSetupErrorCode } from '@/a2e-workspace/utils/getWorkspaceTemplateSetupErrorCode';

describe('getWorkspaceTemplateSetupErrorCode', () => {
  it('returns null when the preview loaded without a discriminator', () => {
    expect(
      getWorkspaceTemplateSetupErrorCode({ previewErrorCode: null }),
    ).toBeNull();
  });

  it('prefers the server discriminator over the transport error', () => {
    expect(
      getWorkspaceTemplateSetupErrorCode({
        previewErrorCode: 'NO_APPS_AVAILABLE',
        error: { networkError: new Error('offline') },
      }),
    ).toBe('NO_APPS_AVAILABLE');
  });

  it('reads a FORBIDDEN GraphQL answer as a permission denial', () => {
    expect(
      getWorkspaceTemplateSetupErrorCode({
        error: { extensions: { code: 'FORBIDDEN' } },
      }),
    ).toBe('PERMISSION_DENIED');
  });

  it('reads a transport failure with no GraphQL answer as a network error', () => {
    expect(
      getWorkspaceTemplateSetupErrorCode({
        error: { networkError: new Error('offline') },
      }),
    ).toBe('NETWORK_ERROR');
  });

  it('does not mislabel a non-permission GraphQL error as a denial', () => {
    expect(
      getWorkspaceTemplateSetupErrorCode({
        error: { extensions: { code: 'INTERNAL_SERVER_ERROR' } },
      }),
    ).toBe('NETWORK_ERROR');
  });
});
