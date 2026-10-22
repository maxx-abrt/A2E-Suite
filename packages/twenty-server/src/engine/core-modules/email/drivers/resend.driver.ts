import { createHash } from 'crypto';
import { type SendMailOptions } from 'nodemailer';
import addressparser from 'nodemailer/lib/addressparser';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';

import { type EmailDriverInterface } from 'src/engine/core-modules/email/drivers/interfaces/email-driver.interface';
import { type ResendApiClientService } from 'src/engine/core-modules/emailing-domain/drivers/resend/services/resend-api-client.service';

const addresses = (input: SendMailOptions['to']): string[] => {
  if (!isDefined(input)) return [];
  return (Array.isArray(input) ? input : [input]).flatMap((value) => {
    if (typeof value === 'string') {
      return addressparser(value, { flatten: true }).map(
        (entry) => entry.address,
      );
    }
    return [value.address];
  });
};

const bodyText = (value: SendMailOptions['text']): string | undefined => {
  if (!isDefined(value)) return undefined;
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  throw new Error('Resend account emails require string or Buffer bodies');
};

export class ResendDriver implements EmailDriverInterface {
  constructor(private readonly client: ResendApiClientService) {}

  async send(message: SendMailOptions): Promise<void> {
    if (Array.isArray(message.from))
      throw new Error('Resend requires one sender');
    const from =
      typeof message.from === 'string'
        ? message.from
        : message.from &&
          `${JSON.stringify(message.from.name)} <${message.from.address}>`;
    const to = addresses(message.to);
    if (!isNonEmptyString(from) || to.length === 0) {
      throw new Error('Resend account emails require a sender and recipients');
    }
    if (
      message.raw ||
      message.envelope ||
      message.alternatives ||
      message.icalEvent
    ) {
      throw new Error(
        'Resend account emails do not support raw MIME or custom envelopes',
      );
    }
    const headers: Record<string, string> = {};
    const headerEntries = Array.isArray(message.headers)
      ? message.headers.map(({ key, value }) => [key, value] as const)
      : Object.entries(message.headers ?? {});
    for (const [key, value] of headerEntries) {
      if (typeof value !== 'string')
        throw new Error('Resend email headers must be strings');
      headers[key] = value;
    }
    const attachments = message.attachments?.map((attachment) => {
      if (
        attachment.path ||
        attachment.cid ||
        !isDefined(attachment.content) ||
        (!Buffer.isBuffer(attachment.content) &&
          typeof attachment.content !== 'string')
      ) {
        throw new Error(
          'Resend account attachments require inline string or Buffer content',
        );
      }
      const encoding = attachment.encoding ?? 'utf8';
      if (!Buffer.isEncoding(encoding))
        throw new Error('Unsupported attachment encoding');
      return {
        filename: attachment.filename || 'attachment',
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content, encoding).toString('base64'),
        content_type: attachment.contentType,
      };
    });
    const cc = addresses(message.cc);
    const bcc = addresses(message.bcc);
    const replyTo = addresses(message.replyTo);
    const response = await this.client.sendEmail(
      {
        from,
        to,
        ...(cc.length ? { cc } : {}),
        ...(bcc.length ? { bcc } : {}),
        ...(replyTo.length ? { reply_to: replyTo } : {}),
        subject: message.subject ?? '',
        text: bodyText(message.text) ?? '',
        html: bodyText(message.html),
        headers,
        attachments,
      },
      message.messageId
        ? `a2e-email/${createHash('sha256').update(message.messageId).digest('hex')}`
        : undefined,
    );
    if (!isNonEmptyString(response.id))
      throw new Error('Resend did not acknowledge the email');
  }
}
