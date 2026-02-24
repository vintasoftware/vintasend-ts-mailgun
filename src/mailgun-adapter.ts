import { BaseNotificationAdapter } from 'vintasend';
import type { BaseEmailTemplateRenderer } from 'vintasend';
import type { JsonObject } from 'vintasend/dist/types/json-values';
import type { AnyDatabaseNotification } from 'vintasend/dist/types/notification';
import type { BaseNotificationTypeConfig } from 'vintasend/dist/types/notification-type-config';
import type { StoredAttachment } from 'vintasend/dist/types/attachment';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName?: string;
  baseUrl?: string;
}

/**
 * Email adapter using the Mailgun REST API directly via fetch.
 * Avoids the mailgun.js npm package to keep Medplum bot bundles small.
 */
export class MailgunAdapter<
  TemplateRenderer extends BaseEmailTemplateRenderer<Config>,
  Config extends BaseNotificationTypeConfig,
> extends BaseNotificationAdapter<TemplateRenderer, Config> {
  key: string | null = 'mailgun';
  private config: MailgunConfig;

  constructor(templateRenderer: TemplateRenderer, enqueueNotifications: boolean, config: MailgunConfig) {
    super(templateRenderer, 'EMAIL', enqueueNotifications);
    this.config = config;
  }

  get supportsAttachments(): boolean {
    return true;
  }

  async send(notification: AnyDatabaseNotification<Config>, context: JsonObject): Promise<void> {
    const template = await this.templateRenderer.render(notification, context);
    const recipientEmail = await this.getRecipientEmail(notification);

    const baseUrl = this.config.baseUrl ?? 'https://api.mailgun.net';
    const url = `${baseUrl}/v3/${this.config.domain}/messages`;
    const credentials = btoa(`api:${this.config.apiKey}`);

    const from = this.config.fromName ? `${this.config.fromName} <${this.config.fromEmail}>` : this.config.fromEmail;

    const formData = new FormData();
    formData.append('from', from);
    formData.append('to', recipientEmail);
    formData.append('subject', template.subject);
    formData.append('html', template.body);

    if (notification.attachments && notification.attachments.length > 0) {
      await this.appendAttachments(formData, notification.attachments);
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

  private async appendAttachments(formData: FormData, attachments: StoredAttachment[]): Promise<void> {
    for (const att of attachments) {
      const content = await att.file.read();
      const blob = new Blob([new Uint8Array(content)], { type: att.contentType });
      formData.append('attachment', blob, att.filename);
    }
  }
}

export class MailgunAdapterFactory<Config extends BaseNotificationTypeConfig> {
  create<TemplateRenderer extends BaseEmailTemplateRenderer<Config>>(
    templateRenderer: TemplateRenderer,
    enqueueNotifications: boolean,
    config: MailgunConfig
  ): MailgunAdapter<TemplateRenderer, Config> {
    return new MailgunAdapter(templateRenderer, enqueueNotifications, config);
  }
}
