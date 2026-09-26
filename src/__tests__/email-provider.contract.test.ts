import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import type { EmailMessage, EmailProvider } from '../email-provider';
import { MailgunEmailProvider } from '../mailgun-provider';
import { SendGridEmailProvider } from '../sendgrid-provider';

const providerImplementations: Array<[string, () => EmailProvider]> = [
  [
    'Mailgun',
    () =>
      new MailgunEmailProvider({
        apiKey: 'x',
        domain: 'mg.example.com',
        fromEmail: 'noreply@example.com',
      }),
  ],
  [
    'SendGrid',
    () =>
      new SendGridEmailProvider({
        apiKey: 'x',
        fromEmail: 'noreply@example.com',
      }),
  ],
];

const message: EmailMessage = {
  to: 'patient@example.com',
  subject: 'Test',
  html: '<p>Hello</p>',
};

describe.each(providerImplementations)('%s EmailProvider contract', (_name, createProvider) => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as any;
  });

  test('supports attachments', () => {
    const provider: EmailProvider = createProvider();

    expect(provider.supportsAttachments).toBe(true);
  });

  test('sends an email through the provider interface', async () => {
    const provider: EmailProvider = createProvider();
    (fetch as Mock).mockResolvedValue({ ok: true, status: 202 } as Response);

    await expect(provider.send(message)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('sends attachments through the provider interface', async () => {
    const provider: EmailProvider = createProvider();
    (fetch as Mock).mockResolvedValue({ ok: true, status: 202 } as Response);

    await expect(
      provider.send({
        ...message,
        attachments: [
          {
            filename: 'report.pdf',
            contentType: 'application/pdf',
            content: new Uint8Array(Buffer.from('PDF content')),
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('rejects failed provider requests', async () => {
    const provider: EmailProvider = createProvider();
    (fetch as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Provider failure'),
    } as Response);

    await expect(provider.send(message)).rejects.toThrow(/send failed \(500\)/);
  });
});
