import type { EmailAttachment, EmailMessage, EmailProvider } from './email-provider.js';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  baseUrl?: string;
  sandboxMode?: boolean;
}

interface SendGridAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: 'attachment';
}

interface SendGridRequest {
  personalizations: Array<{
    to: Array<{ email: string }>;
  }>;
  from: {
    email: string;
    name?: string;
  };
  subject: string;
  content: Array<{
    type: 'text/html';
    value: string;
  }>;
  attachments?: SendGridAttachment[];
  mail_settings?: {
    sandbox_mode: {
      enable: boolean;
    };
  };
}

/**
 * Sends email through the SendGrid Mail Send REST API.
 */
export class SendGridEmailProvider implements EmailProvider {
  readonly supportsAttachments = true;
  private readonly config: SendGridConfig;

  constructor(config: SendGridConfig) {
    this.config = config;
  }

  async send({ to, subject, html, attachments }: EmailMessage): Promise<void> {
    const request: SendGridRequest = {
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: this.config.fromEmail,
        ...(this.config.fromName ? { name: this.config.fromName } : {}),
      },
      subject,
      content: [{ type: 'text/html', value: html }],
    };

    if (attachments && attachments.length > 0) {
      request.attachments = attachments.map((attachment) => this.toSendGridAttachment(attachment));
    }

    if (this.config.sandboxMode) {
      request.mail_settings = {
        sandbox_mode: {
          enable: true,
        },
      };
    }

    const baseUrl = this.config.baseUrl ?? 'https://api.sendgrid.com';
    const response = await fetch(`${baseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid send failed (${response.status}): ${errorBody}`);
    }
  }

  private toSendGridAttachment(attachment: EmailAttachment): SendGridAttachment {
    return {
      content: this.toBase64(attachment.content),
      filename: attachment.filename,
      type: attachment.contentType,
      disposition: 'attachment',
    };
  }

  private toBase64(content: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;

    for (let offset = 0; offset < content.length; offset += chunkSize) {
      binary += String.fromCharCode(...content.subarray(offset, offset + chunkSize));
    }

    return btoa(binary);
  }
}
