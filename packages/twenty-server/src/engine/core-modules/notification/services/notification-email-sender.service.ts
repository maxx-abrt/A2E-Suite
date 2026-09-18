import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  NotificationDigestEmail,
  NotificationEmail,
  renderEmail,
} from 'twenty-emails';
import { In, type Repository } from 'typeorm';

import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { type NotificationEmailDigestBatch } from 'src/engine/core-modules/notification/utils/group-notifications-into-digest-batches.util';
import { buildNotificationEmailItems } from 'src/engine/core-modules/notification/utils/notification-email-item.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// Turns the email-channel digest batches that NotificationService plans into
// actual messages through the shared `EmailService` queue: no parallel mailing
// path. Channel preferences and quiet hours are already applied upstream, so
// this service only resolves recipients and renders (delivering exactly the
// batches it is given). A batch with one item sends the instant template; a
// collapsed window with several sends the digest template.
@Injectable()
export class NotificationEmailSenderService {
  private readonly logger = new Logger(NotificationEmailSenderService.name);

  constructor(
    // Recipients are core users read by id outside a workspace ORM context,
    // like the notification rows this service is fed.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly emailService: EmailService,
    private readonly i18nService: I18nService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {}

  async sendEmailDigestBatches({
    workspaceId,
    batches,
  }: {
    workspaceId: string;
    batches: NotificationEmailDigestBatch[];
  }): Promise<number> {
    if (batches.length === 0) {
      return 0;
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!isDefined(workspace)) {
      return 0;
    }

    const inboxLink = this.buildInboxLink(workspace);
    const recipientsByUserId = await this.loadRecipientsByUserId(batches);
    let sentCount = 0;

    for (const batch of batches) {
      const recipient = recipientsByUserId.get(batch.userId);

      if (!isDefined(recipient) || !isNonEmptyString(recipient.email)) {
        continue;
      }

      try {
        await this.sendBatch({ batch, recipient, inboxLink });
        sentCount += 1;
      } catch (error) {
        // One unrenderable batch must not drop the rest of the dispatch; the
        // durable notification rows remain the catch-up source.
        this.logger.error(
          `Failed to send notification email to user ${batch.userId}`,
          error,
        );
      }
    }

    return sentCount;
  }

  private async sendBatch({
    batch,
    recipient,
    inboxLink,
  }: {
    batch: NotificationEmailDigestBatch;
    recipient: UserEntity;
    inboxLink: string;
  }): Promise<void> {
    const locale = recipient.locale;
    const i18n = this.i18nService.getI18nInstance(locale);
    const items = buildNotificationEmailItems({
      digestItems: batch.items,
      translate: (label) => i18n._(label),
    });

    if (items.length === 0) {
      return;
    }

    const isDigest = items.length > 1;
    const emailTemplate = isDigest
      ? NotificationDigestEmail({ items, link: inboxLink, locale })
      : NotificationEmail({ item: items[0], link: inboxLink, locale });

    const html = await renderEmail(emailTemplate, { pretty: true });
    const text = await renderEmail(emailTemplate, { plainText: true });
    const subject = isDigest
      ? i18n._(msg`Your notifications digest`)
      : i18n._(msg`New notification`);

    await this.emailService.send({
      from: `${this.twentyConfigService.get(
        'EMAIL_FROM_NAME',
      )} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: recipient.email,
      subject,
      html,
      text,
    });
  }

  private async loadRecipientsByUserId(
    batches: NotificationEmailDigestBatch[],
  ): Promise<Map<string, UserEntity>> {
    const userIds = [...new Set(batches.map((batch) => batch.userId))];

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });

    return new Map(users.map((user) => [user.id, user]));
  }

  private buildInboxLink(workspace: WorkspaceEntity): string {
    return this.workspaceDomainsService
      .buildWorkspaceURL({
        workspace:
          this.workspaceDomainsService.getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain(
            workspace,
          ),
        pathname: AppPath.Inbox,
      })
      .toString();
  }
}
