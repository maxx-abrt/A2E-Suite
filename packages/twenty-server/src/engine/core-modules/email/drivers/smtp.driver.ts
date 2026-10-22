import { Logger } from '@nestjs/common';

import {
  createTransport,
  type SendMailOptions,
  type Transporter,
} from 'nodemailer';

import { type EmailDriverInterface } from 'src/engine/core-modules/email/drivers/interfaces/email-driver.interface';

import type SMTPConnection from 'nodemailer/lib/smtp-connection';

export class SmtpDriver implements EmailDriverInterface {
  private readonly logger = new Logger(SmtpDriver.name);
  private transport: Transporter;

  constructor(options: SMTPConnection.Options) {
    this.transport = createTransport(options);
  }

  async send(sendMailOptions: SendMailOptions): Promise<void> {
    // The queue must see delivery failures to retry the job instead of completing it.
    await this.transport.sendMail(sendMailOptions);
    this.logger.log('Email accepted by SMTP server');
  }
}
