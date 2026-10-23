import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { PublicDomainEntity } from 'src/engine/core-modules/public-domain/public-domain.entity';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const APP_ORIGIN = 'https://bureau.example.com';

describe('shared-domain workspace resolution', () => {
  let service: WorkspaceDomainsService;
  let sharedDomainEnabled = true;
  const workspaceRepository = { findOne: jest.fn(), find: jest.fn() };
  const publicDomainRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    sharedDomainEnabled = true;
    const module = await Test.createTestingModule({
      providers: [
        WorkspaceDomainsService,
        {
          provide: TwentyConfigService,
          useValue: {
            get: (key: string) =>
              key === 'IS_SHARED_DOMAIN_WORKSPACE_ENABLED'
                ? sharedDomainEnabled
                : false,
          },
        },
        {
          provide: DomainServerConfigService,
          useValue: {
            getFrontUrl: () => new URL(APP_ORIGIN),
            getSubdomainAndDomainFromUrl: (origin: string) => ({
              domain: new URL(origin).hostname,
              subdomain: undefined,
              isPublicDomainOrigin: false,
            }),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: workspaceRepository,
        },
        {
          provide: getRepositoryToken(PublicDomainEntity),
          useValue: publicDomainRepository,
        },
      ],
    }).compile();
    service = module.get(WorkspaceDomainsService);
  });

  it('never picks an arbitrary existing workspace for account entry', async () => {
    await expect(
      service.getWorkspaceByOriginOrDefaultWorkspace(APP_ORIGIN),
    ).resolves.toBeUndefined();
    expect(workspaceRepository.find).not.toHaveBeenCalled();
    expect(workspaceRepository.findOne).not.toHaveBeenCalled();
  });

  it('resolves the signed login token workspace on the configured origin', async () => {
    workspaceRepository.findOne.mockResolvedValue({ id: 'second-workspace' });
    await expect(
      service.getWorkspaceForLoginToken(APP_ORIGIN, 'second-workspace'),
    ).resolves.toEqual({ id: 'second-workspace' });
    expect(workspaceRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'second-workspace' } }),
    );
    expect(workspaceRepository.find).not.toHaveBeenCalled();
  });

  it.each([
    'https://other.example.com',
    'http://bureau.example.com',
    'https://bureau.example.com:444',
  ])('refuses token exchange from a different origin: %s', async (origin) => {
    await expect(
      service.getWorkspaceForLoginToken(origin, 'second-workspace'),
    ).resolves.toBeUndefined();
    expect(workspaceRepository.findOne).not.toHaveBeenCalled();
  });

  it('does not return a nonexistent token workspace', async () => {
    workspaceRepository.findOne.mockResolvedValue(null);
    await expect(
      service.getWorkspaceForLoginToken(APP_ORIGIN, 'missing'),
    ).resolves.toBeUndefined();
  });

  it('uses the central origin for all workspace links, including older custom domains', () => {
    expect(
      service.getWorkspaceUrls({
        subdomain: 'second-workspace',
        customDomain: 'old.example.com',
        isCustomDomainEnabled: true,
      }),
    ).toEqual({ subdomainUrl: `${APP_ORIGIN}/`, customUrl: undefined });
  });

  it('retains default-workspace resolution when shared-domain mode is disabled', async () => {
    sharedDomainEnabled = false;
    workspaceRepository.find.mockResolvedValue([{ id: 'legacy-workspace' }]);
    publicDomainRepository.findOne.mockResolvedValue(null);
    await expect(
      service.getWorkspaceForLoginToken(APP_ORIGIN, 'legacy-workspace'),
    ).resolves.toEqual({ id: 'legacy-workspace' });
  });
});
