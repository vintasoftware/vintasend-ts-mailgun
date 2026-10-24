import type { EmailMessage, EmailProvider } from './email-provider.js';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName?: string;
  baseUrl?: string;
}

/**
 * Sends email through the Mailgun REST API.
 */
export class MailgunEmailProvider implements EmailProvider {
  readonly supportsAttachments = true;
  private readonly config: MailgunConfig;

  constructor(config: MailgunConfig) {
    this.config = config;
  }

  async send({ to, subject, html, attachments }: EmailMessage): Promise<void> {
    const baseUrl = this.config.baseUrl ?? 'https://api.mailgun.net';
    const url = `${baseUrl}/v3/${this.config.domain}/messages`;
    const credentials = btoa(`api:${this.config.apiKey}`);

    const from = this.config.fromName
      ? `${this.config.fromName} <${this.config.fromEmail}>`
      : this.config.fromEmail;

    const formData = new FormData();
    formData.append('from', from);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);

    if (attachments && attachments.length > 0) {
      this.appendAttachments(formData, attachments);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mailgun send failed (${response.status}): ${errorBody}`);
    }
  }

  private appendAttachments(formData: FormData, attachments: EmailMessage['attachments']): void {
    if (!attachments) {
      return;
    }

    for (const attachment of attachments) {
      const blob = new Blob([new Uint8Array(attachment.content)], {
        type: attachment.contentType,
      });
      formData.append('attachment', blob, attachment.filename);
    }
  }
}
