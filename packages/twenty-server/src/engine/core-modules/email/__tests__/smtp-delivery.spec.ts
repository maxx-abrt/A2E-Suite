import { createTransport } from 'nodemailer';

import { SmtpDriver } from 'src/engine/core-modules/email/drivers/smtp.driver';
import { EmailDriverFactory } from 'src/engine/core-modules/email/email-driver.factory';
import { EmailSenderJob } from 'src/engine/core-modules/email/email-sender.job';
import { EmailSenderService } from 'src/engine/core-modules/email/email-sender.service';
import { EmailDriver } from 'src/engine/core-modules/email/enums/email-driver.enum';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const message = {
  from: 'A2E Suite <noreply@example.com>',
  to: 'delivered@resend.dev',
  subject: 'Account verification',
  text: 'Disposable delivery test',
};

const createFactory = (port = 587, noTLS = false) => {
  const configuration: Record<string, string | number | boolean> = {
    EMAIL_DRIVER: EmailDriver.SMTP,
    EMAIL_SMTP_HOST: 'smtp.resend.com',
    EMAIL_SMTP_PORT: port,
    EMAIL_SMTP_USER: 'resend',
    EMAIL_SMTP_PASSWORD: 'disposable-test-credential',
    EMAIL_SMTP_NO_TLS: noTLS,
  };

  return new EmailDriverFactory(
    { get: jest.fn((key: string) => configuration[key]) } as never,
    { computeHash: jest.fn(() => 'test-configuration') } as never,
    {} as never,
  );
};

describe('SMTP delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockReset();
  });

  it('keeps the email job pending until the SMTP server acknowledges the message', async () => {
    let acknowledge: (() => void) | undefined;
    mockSendMail.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = resolve;
        }),
    );
    const job = new EmailSenderJob(new EmailSenderService(createFactory()));
    const completed = jest.fn();
    const sending = job.handle(message).then(completed);

    await Promise.resolve();
    await Promise.resolve();
    expect(completed).not.toHaveBeenCalled();

    acknowledge?.();
    await sending;
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('propagates provider failure through the native sender and worker for retry', async () => {
    const providerError = new Error('SMTP temporary rejection');
    mockSendMail.mockRejectedValueOnce(providerError).mockResolvedValueOnce({});
    const job = new EmailSenderJob(new EmailSenderService(createFactory()));

    await expect(job.handle(message)).rejects.toBe(providerError);
    await expect(job.handle(message)).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockSendMail).toHaveBeenLastCalledWith(message);
  });

  it('does not swallow transport failures in the driver', async () => {
    const connectionError = new Error('SMTP connection refused');
    mockSendMail.mockRejectedValue(connectionError);
    const driver = new SmtpDriver({ host: 'smtp.resend.com', port: 587 });

    await expect(driver.send(message)).rejects.toBe(connectionError);
  });

  it.each([587, 2587, 25])('requires STARTTLS on port %i', (port) => {
    createFactory(port).getCurrentDriver();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.resend.com',
        port,
        secure: false,
        requireTLS: true,
        auth: { user: 'resend', pass: 'disposable-test-credential' },
      }),
    );
  });

  it.each([465, 2465])('uses implicit TLS on port %i', (port) => {
    createFactory(port).getCurrentDriver();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port,
        secure: true,
        requireTLS: false,
      }),
    );
  });

  it('preserves explicitly configured plaintext SMTP for local test servers', () => {
    createFactory(1025, true).getCurrentDriver();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 1025,
        secure: false,
        requireTLS: false,
        ignoreTLS: true,
      }),
    );
  });
});
