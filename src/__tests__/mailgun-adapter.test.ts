import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import type { MailgunConfig } from '../mailgun-adapter';
import { MailgunAdapter, MailgunAdapterFactory } from '../mailgun-adapter';

const mockTemplateRenderer = {
  render: vi.fn(),
  injectLogger: vi.fn(),
};

const mailgunConfig: MailgunConfig = {
  apiKey: 'key-test123',
  domain: 'mg.example.com',
  fromEmail: 'noreply@example.com',
  fromName: 'Polaris Sleep',
};

function createNotification(overrides = {}) {
  return {
    id: 'notif-1',
    emailOrPhone: 'patient@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    notificationType: 'EMAIL' as const,
    title: 'Test',
    bodyTemplate: 'email/test/body.html.pug',
    subjectTemplate: 'email/test/subject.pug',
    contextName: 'taskAssignment',
    contextParameters: {},
    sendAfter: new Date(),
    status: 'PENDING_SEND' as const,
    contextUsed: null,
    extraParams: {},
    adapterUsed: null,
    sentAt: null,
    readAt: null,
    attachments: null,
    ...overrides,
  };
}

describe('MailgunAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as any;
  });

  test('has correct key and notificationType', () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    expect(adapter.key).toBe('mailgun');
    expect(adapter.notificationType).toBe('EMAIL');
  });

  test('supportsAttachments returns true', () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    expect(adapter.supportsAttachments).toBe(true);
  });

  test('send() renders template and calls Mailgun API', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    const notification = createNotification();
    const context = { firstName: 'Jane', taskTitle: 'Review sleep study' };

    mockTemplateRenderer.render.mockResolvedValue({
      subject: 'New Task Assignment',
      body: '<p>Hello Jane, you have a new task: Review sleep study</p>',
    });

    const mockResponse = { ok: true, status: 200 };
    (fetch as Mock).mockResolvedValue(mockResponse as Response);

    await adapter.send(notification as any, context);

    expect(mockTemplateRenderer.render).toHaveBeenCalledWith(notification, context);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as Mock).mock.calls[0];
    expect(url).toBe(`https://api.mailgun.net/v3/${mailgunConfig.domain}/messages`);

    const expectedCredentials = btoa(`api:${mailgunConfig.apiKey}`);
    expect(options?.headers).toEqual(
      expect.objectContaining({
        Authorization: `Basic ${expectedCredentials}`,
      }),
    );

    const body = options?.body as FormData;
    expect(body.get('from')).toBe('Polaris Sleep <noreply@example.com>');
    expect(body.get('to')).toBe('patient@example.com');
    expect(body.get('subject')).toBe('New Task Assignment');
    expect(body.get('html')).toBe('<p>Hello Jane, you have a new task: Review sleep study</p>');
  });

  test('send() uses fromEmail only when fromName is not set', async () => {
    const configNoName: MailgunConfig = {
      apiKey: 'key-test123',
      domain: 'mg.example.com',
      fromEmail: 'noreply@example.com',
    };
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, configNoName);
    const notification = createNotification();

    mockTemplateRenderer.render.mockResolvedValue({ subject: 'Test', body: '<p>Hi</p>' });
    (fetch as Mock).mockResolvedValue({ ok: true, status: 200 } as Response);

    await adapter.send(notification as any, {});

    const body = (fetch as Mock).mock.calls[0][1]?.body as FormData;
    expect(body.get('from')).toBe('noreply@example.com');
  });

  test('send() uses custom baseUrl for EU region', async () => {
    const euConfig: MailgunConfig = {
      ...mailgunConfig,
      baseUrl: 'https://api.eu.mailgun.net',
    };
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, euConfig);
    const notification = createNotification();

    mockTemplateRenderer.render.mockResolvedValue({ subject: 'Test', body: '<p>Hi</p>' });
    (fetch as Mock).mockResolvedValue({ ok: true, status: 200 } as Response);

    await adapter.send(notification as any, {});

    const [url] = (fetch as Mock).mock.calls[0];
    expect(url).toBe(`https://api.eu.mailgun.net/v3/${euConfig.domain}/messages`);
  });

  test('send() throws on non-ok response', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    const notification = createNotification();

    mockTemplateRenderer.render.mockResolvedValue({ subject: 'Test', body: '<p>Hi</p>' });

    const mockResponse = {
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Forbidden: Invalid API key'),
    };
    (fetch as Mock).mockResolvedValue(mockResponse as any);

    await expect(adapter.send(notification as any, {})).rejects.toThrow(
      'Mailgun send failed (401): Forbidden: Invalid API key',
    );
  });

  test('send() throws on fetch failure', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    const notification = createNotification();

    mockTemplateRenderer.render.mockResolvedValue({ subject: 'Test', body: '<p>Hi</p>' });
    (fetch as Mock).mockRejectedValue(new Error('Network error'));

    await expect(adapter.send(notification as any, {})).rejects.toThrow('Network error');
  });

  test('send() appends attachments when present', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, mailgunConfig);
    const fileContent = Buffer.from('PDF content');
    const notification = createNotification({
      attachments: [
        {
          filename: 'report.pdf',
          contentType: 'application/pdf',
          file: { read: vi.fn().mockResolvedValue(fileContent) },
        },
      ],
    });

    mockTemplateRenderer.render.mockResolvedValue({ subject: 'Test', body: '<p>Hi</p>' });
    (fetch as Mock).mockResolvedValue({ ok: true, status: 200 } as Response);

    await adapter.send(notification as any, {});

    const body = (fetch as Mock).mock.calls[0][1]?.body as FormData;
    const attachment = body.get('attachment') as File;
    expect(attachment).toBeTruthy();
    expect(attachment.name).toBe('report.pdf');
    expect(attachment.type).toBe('application/pdf');
  });
});

describe('MailgunAdapterFactory', () => {
  test('creates a MailgunAdapter instance', () => {
    const factory = new MailgunAdapterFactory();
    const adapter = factory.create(mockTemplateRenderer as any, false, mailgunConfig);
    expect(adapter).toBeInstanceOf(MailgunAdapter);
    expect(adapter.key).toBe('mailgun');
  });
});
