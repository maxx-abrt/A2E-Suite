import { Injectable } from '@nestjs/common';

import { type SendMailOptions } from 'nodemailer';
import { randomUUID } from 'crypto';

import { EmailSenderJob } from 'src/engine/core-modules/email/email-sender.job';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

@Injectable()
export class EmailService {
  constructor(
    @InjectMessageQueue(MessageQueue.emailQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async send(sendMailOptions: SendMailOptions): Promise<void> {
    await this.messageQueueService.add<SendMailOptions>(
      EmailSenderJob.name,
      {
        ...sendMailOptions,
        messageId: sendMailOptions.messageId ?? `<${randomUUID()}@a2e.invalid>`,
      },
      { retryLimit: 3 },
    );
  }
}
