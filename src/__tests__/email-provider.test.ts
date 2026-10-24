import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EmailProvider } from '../email-provider';
import { MailgunAdapter } from '../mailgun-adapter';

const mockTemplateRenderer = {
  render: vi.fn(),
  injectLogger: vi.fn(),
};

const sendEmail = vi.fn();
const emailProvider: EmailProvider = {
  supportsAttachments: true,
  send: sendEmail,
};

const notification = {
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
};

describe('MailgunAdapter email provider boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmail.mockResolvedValue(undefined);
  });

  test('renders the notification and delegates delivery to the provider', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, emailProvider);
    const renderedTemplate = {
      subject: 'New Task Assignment',
      body: '<p>Hello Jane</p>',
    };
    mockTemplateRenderer.render.mockResolvedValue(renderedTemplate);

    await adapter.send(notification as any, { firstName: 'Jane' });

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'patient@example.com',
      subject: renderedTemplate.subject,
      html: renderedTemplate.body,
      attachments: undefined,
    });
  });

  test('passes notification attachments to the provider', async () => {
    const adapter = new MailgunAdapter(mockTemplateRenderer as any, false, emailProvider);
    const fileContent = new Uint8Array(Buffer.from('PDF content'));
    const attachmentNotification = {
      ...notification,
      attachments: [
        {
          filename: 'report.pdf',
          contentType: 'application/pdf',
          file: { read: vi.fn().mockResolvedValue(fileContent) },
        },
      ],
    };
    mockTemplateRenderer.render.mockResolvedValue({
      subject: 'Test',
      body: '<p>Hi</p>',
    });

    await adapter.send(attachmentNotification as any, {});

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'patient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      attachments: [
        {
          filename: 'report.pdf',
          contentType: 'application/pdf',
          content: fileContent,
        },
      ],
    });
  });
});
