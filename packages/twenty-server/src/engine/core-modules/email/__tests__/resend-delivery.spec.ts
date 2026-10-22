import { EmailService } from 'src/engine/core-modules/email/email.service';
import { EmailDriverFactory } from 'src/engine/core-modules/email/email-driver.factory';
import { EmailSenderJob } from 'src/engine/core-modules/email/email-sender.job';
import { EmailSenderService } from 'src/engine/core-modules/email/email-sender.service';
import { ResendApiClientService } from 'src/engine/core-modules/emailing-domain/drivers/resend/services/resend-api-client.service';
import { ResendDriver } from 'src/engine/core-modules/email/drivers/resend.driver';
import { type SendMailOptions } from 'nodemailer';

const message: SendMailOptions = {
  from: 'A2E Suite <onboarding@resend.dev>',
  to: 'delivered@resend.dev',
  subject: 'Disposable account email',
  text: 'No credentials',
  html: '<p>No credentials</p>',
};

describe('Resend REST account delivery', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();
  const configuration = { get: jest.fn(() => 'disposable-api-key') };
  const client = new ResendApiClientService(configuration as never);
  const driver = new ResendDriver(client);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'provider-message' }),
    });
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('delivers native account text and HTML through the authenticated REST API', async () => {
    await driver.send(message);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer disposable-api-key',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: {},
    });
  });

  it('preserves address lists, reply-to, headers and inline attachments', async () => {
    await driver.send({
      ...message,
      from: { name: 'A2E Team', address: 'onboarding@resend.dev' },
      to: '"Test, Person" <delivered@resend.dev>, delivered+team@resend.dev',
      cc: [{ name: 'Team', address: 'delivered+cc@resend.dev' }],
      replyTo: 'reply@example.com',
      headers: { 'X-Entity-Ref-ID': 'disposable-reference' },
      attachments: [
        { filename: 'example.txt', content: Buffer.from('example') },
      ],
    });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      from: '"A2E Team" <onboarding@resend.dev>',
      to: ['delivered@resend.dev', 'delivered+team@resend.dev'],
      cc: ['delivered+cc@resend.dev'],
      reply_to: ['reply@example.com'],
      headers: { 'X-Entity-Ref-ID': 'disposable-reference' },
      attachments: [
        {
          filename: 'example.txt',
          content: Buffer.from('example').toString('base64'),
        },
      ],
    });
  });

  it('assigns distinct IDs before enqueueing and reuses the original key for worker retries', async () => {
    const add = jest.fn();
    const service = new EmailService({ add } as never);
    await service.send(message);
    await service.send(message);
    const queued = add.mock.calls[0][1];
    expect(queued.messageId).not.toBe(add.mock.calls[1][1].messageId);
    const factory = new EmailDriverFactory(
      { get: () => 'RESEND' } as never,
      { computeHash: () => 'key-hash' } as never,
      client,
    );
    const job = new EmailSenderJob(new EmailSenderService(factory));
    mockFetch.mockRejectedValueOnce(new Error('Connection interrupted'));
    await expect(job.handle(queued)).rejects.toThrow('Connection interrupted');
    await job.handle(queued);
    const firstKey = mockFetch.mock.calls[0][1].headers['Idempotency-Key'];
    expect(firstKey).toMatch(/^a2e-email\/[a-f0-9]{64}$/);
    expect(mockFetch.mock.calls[1][1].headers['Idempotency-Key']).toBe(
      firstKey,
    );
  });

  it.each([401, 403, 422, 429, 500])(
    'propagates HTTP %i rather than completing the email job',
    async (status) => {
      mockFetch.mockResolvedValue({
        ok: false,
        status,
        text: async () => JSON.stringify({ message: 'Provider rejection' }),
      });
      await expect(driver.send(message)).rejects.toThrow(`status ${status}`);
    },
  );

  it('rejects missing provider acknowledgement', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    });
    await expect(driver.send(message)).rejects.toThrow('did not acknowledge');
  });

  it('does not fetch files or silently omit unsupported attachments', async () => {
    await expect(
      driver.send({
        ...message,
        attachments: [{ path: 'https://example.com/private-file' }],
      }),
    ).rejects.toThrow('inline');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
