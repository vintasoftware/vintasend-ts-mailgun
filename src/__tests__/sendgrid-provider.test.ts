import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import type { EmailProvider } from '../email-provider';
import { type SendGridConfig, SendGridEmailProvider } from '../sendgrid-provider';

const sendGridConfig: SendGridConfig = {
  apiKey: 'x',
  fromEmail: 'noreply@example.com',
  fromName: 'Example App',
};

function createProvider(overrides: Partial<SendGridConfig> = {}): EmailProvider {
  return new SendGridEmailProvider({ ...sendGridConfig, ...overrides });
}

describe('SendGridEmailProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as any;
  });

  test('sends a message through the SendGrid Mail Send API', async () => {
    const provider: EmailProvider = createProvider();
    (fetch as Mock).mockResolvedValue({ ok: true, status: 202 } as Response);

    await provider.send({
      to: 'patient@example.com',
      subject: 'New Task Assignment',
      html: '<p>Hello Jane</p>',
    });

    const [url, options] = (fetch as Mock).mock.calls[0];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({
      Authorization: 'Bearer x',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(options?.body)).toEqual({
      personalizations: [{ to: [{ email: 'patient@example.com' }] }],
      from: {
        email: 'noreply@example.com',
        name: 'Example App',
      },
      subject: 'New Task Assignment',
      content: [{ type: 'text/html', value: '<p>Hello Jane</p>' }],
    });
  });

  test('encodes attachments and enables sandbox mode', async () => {
    const provider: EmailProvider = createProvider({ sandboxMode: true });
    (fetch as Mock).mockResolvedValue({ ok: true, status: 202 } as Response);

    await provider.send({
      to: 'patient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      attachments: [
        {
          filename: 'report.pdf',
          contentType: 'application/pdf',
          content: new Uint8Array(Buffer.from('PDF content')),
        },
      ],
    });

    const body = JSON.parse((fetch as Mock).mock.calls[0][1]?.body);
    expect(body.attachments).toEqual([
      {
        content: Buffer.from('PDF content').toString('base64'),
        filename: 'report.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ]);
    expect(body.mail_settings).toEqual({
      sandbox_mode: {
        enable: true,
      },
    });
  });

  test('uses a custom API base URL', async () => {
    const provider: EmailProvider = createProvider({
      baseUrl: 'https://api.example.test',
    });
    (fetch as Mock).mockResolvedValue({ ok: true, status: 202 } as Response);

    await provider.send({
      to: 'patient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });

    const [url] = (fetch as Mock).mock.calls[0];
    expect(url).toBe('https://api.example.test/v3/mail/send');
  });

  test('throws the SendGrid response body on failure', async () => {
    const provider: EmailProvider = createProvider();
    const response = {
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    };
    (fetch as Mock).mockResolvedValue(response as Response);

    await expect(
      provider.send({
        to: 'patient@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      }),
    ).rejects.toThrow('SendGrid send failed (401): Unauthorized');
  });
});
