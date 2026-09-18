import { Logger } from '@nestjs/common';

import { type MessageDescriptor } from '@lingui/core';
import { type Repository } from 'typeorm';

import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { NotificationEmailSenderService } from 'src/engine/core-modules/notification/services/notification-email-sender.service';
import { type NotificationEmailDigestBatch } from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const WORKSPACE = {
  id: 'workspace-1',
  subdomain: 'acme',
  customDomain: null,
  isCustomDomainEnabled: false,
} as unknown as WorkspaceEntity;

const buildBatch = (
  overrides: Partial<NotificationEmailDigestBatch> = {},
): NotificationEmailDigestBatch => ({
  userId: 'user-1',
  windowStart: new Date('2026-09-18T10:00:00.000Z'),
  windowEnd: new Date('2026-09-18T10:15:00.000Z'),
  items: [
    {
      userId: 'user-1',
      type: 'MENTION',
      payload: { snippet: 'Can you review the budget?' },
      createdAt: new Date('2026-09-18T10:01:00.000Z'),
    },
  ],
  ...overrides,
});

describe('NotificationEmailSenderService', () => {
  let userRepository: { find: jest.Mock };
  let workspaceRepository: { findOne: jest.Mock };
  let emailService: { send: jest.Mock };
  let i18nService: { getI18nInstance: jest.Mock };
  let twentyConfigService: { get: jest.Mock };
  let workspaceDomainsService: {
    getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain: jest.Mock;
    buildWorkspaceURL: jest.Mock;
  };
  let service: NotificationEmailSenderService;

  beforeEach(() => {
    // render() resolves through a streaming scheduler that never advances under
    // the globally enabled fake timers.
    jest.useRealTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    userRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'user-1',
          email: 'member@example.com',
          locale: 'en',
        },
      ]),
    };
    workspaceRepository = {
      findOne: jest.fn().mockResolvedValue(WORKSPACE),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    i18nService = {
      // Stands in for the "en" catalog: a msg descriptor resolves to its source
      // text, a plain string key to itself.
      getI18nInstance: jest.fn().mockReturnValue({
        _: (descriptor: MessageDescriptor | string) =>
          typeof descriptor === 'string'
            ? descriptor
            : (descriptor.message ?? descriptor.id),
      }),
    };
    twentyConfigService = {
      get: jest.fn((key: string) =>
        key === 'EMAIL_FROM_NAME' ? 'A2E Suite' : 'no-reply@a2esuite.test',
      ),
    };
    workspaceDomainsService = {
      getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain:
        jest.fn((workspace: WorkspaceEntity) => workspace),
      buildWorkspaceURL: jest
        .fn()
        .mockReturnValue(new URL('https://acme.example.com/inbox')),
    };

    service = new NotificationEmailSenderService(
      userRepository as unknown as Repository<UserEntity>,
      workspaceRepository as unknown as Repository<WorkspaceEntity>,
      emailService as unknown as EmailService,
      i18nService as unknown as I18nService,
      twentyConfigService as unknown as TwentyConfigService,
      workspaceDomainsService as unknown as WorkspaceDomainsService,
    );
  });

  afterEach(() => {
    jest.useFakeTimers();
  });

  it('sends an instant email for a single-item batch', async () => {
    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [buildBatch()],
    });

    expect(sentCount).toBe(1);
    expect(emailService.send).toHaveBeenCalledTimes(1);

    const sendOptions = emailService.send.mock.calls[0][0];

    expect(sendOptions).toMatchObject({
      to: 'member@example.com',
      subject: 'New notification',
    });
    expect(sendOptions.html).toContain('You were mentioned');
    expect(sendOptions.html).toContain('Can you review the budget?');
    expect(sendOptions.html).toContain('https://acme.example.com/inbox');
    // The digest heading must not leak into the instant template.
    expect(sendOptions.html).not.toContain('New notifications');
    expect(sendOptions.text.trim().length).toBeGreaterThan(0);
  });

  it('sends a digest email for a collapsed multi-item batch', async () => {
    const batch = buildBatch({
      items: [
        {
          userId: 'user-1',
          type: 'MENTION',
          payload: { snippet: 'First' },
          createdAt: new Date('2026-09-18T10:01:00.000Z'),
        },
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: { snippet: 'Second' },
          createdAt: new Date('2026-09-18T10:02:00.000Z'),
        },
      ],
    });

    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [batch],
    });

    expect(sentCount).toBe(1);

    const sendOptions = emailService.send.mock.calls[0][0];

    expect(sendOptions.subject).toBe('Your notifications digest');
    expect(sendOptions.html).toContain('New notifications');
    expect(sendOptions.html).toContain('First');
    expect(sendOptions.html).toContain('Second');
  });

  it('skips a recipient that has no email address', async () => {
    userRepository.find.mockResolvedValue([
      { id: 'user-1', email: '', locale: 'en' },
    ]);

    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [buildBatch()],
    });

    expect(sentCount).toBe(0);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('skips a batch whose user no longer exists', async () => {
    userRepository.find.mockResolvedValue([]);

    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [buildBatch()],
    });

    expect(sentCount).toBe(0);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('does nothing for an empty batch list', async () => {
    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [],
    });

    expect(sentCount).toBe(0);
    expect(workspaceRepository.findOne).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('does nothing when the workspace cannot be resolved', async () => {
    workspaceRepository.findOne.mockResolvedValue(null);

    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [buildBatch()],
    });

    expect(sentCount).toBe(0);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('keeps sending the remaining batches when one send fails', async () => {
    userRepository.find.mockResolvedValue([
      { id: 'user-1', email: 'first@example.com', locale: 'en' },
      { id: 'user-2', email: 'second@example.com', locale: 'en' },
    ]);
    emailService.send
      .mockRejectedValueOnce(new Error('smtp down'))
      .mockResolvedValue(undefined);

    const sentCount = await service.sendEmailDigestBatches({
      workspaceId: 'workspace-1',
      batches: [buildBatch(), buildBatch({ userId: 'user-2' })],
    });

    expect(sentCount).toBe(1);
    expect(emailService.send).toHaveBeenCalledTimes(2);
  });
});
