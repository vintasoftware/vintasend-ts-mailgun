import type {
  AnyDatabaseNotification,
  BaseEmailTemplateRenderer,
  BaseNotificationTypeConfig,
  EmailTemplate,
  JsonObject,
  StoredAttachment,
} from 'vintasend';
import { BaseNotificationAdapter } from 'vintasend';
import type { EmailAttachment, EmailProvider } from './email-provider.js';
import { type MailgunConfig, MailgunEmailProvider } from './mailgun-provider.js';

export type { MailgunConfig } from './mailgun-provider.js';

export class MailgunAdapter<
  TemplateRenderer extends BaseEmailTemplateRenderer<Config>,
  Config extends BaseNotificationTypeConfig,
> extends BaseNotificationAdapter<TemplateRenderer, Config> {
  key: string | null = 'mailgun';
  private readonly emailProvider: EmailProvider;

  constructor(
    templateRenderer: TemplateRenderer,
    enqueueNotifications: boolean,
    config: MailgunConfig,
  );
  constructor(
    templateRenderer: TemplateRenderer,
    enqueueNotifications: boolean,
    emailProvider: EmailProvider,
  );
  constructor(
    templateRenderer: TemplateRenderer,
    enqueueNotifications: boolean,
    configOrProvider: MailgunConfig | EmailProvider,
  ) {
    super(templateRenderer, 'EMAIL', enqueueNotifications);
    this.emailProvider =
      'send' in configOrProvider ? configOrProvider : new MailgunEmailProvider(configOrProvider);
  }

  get supportsAttachments(): boolean {
    return this.emailProvider.supportsAttachments;
  }

  /**
   * Returns what the renderer produced so the service can record which template version rendered
   * this notification. Nothing else reads it — the message is already sent by then.
   */
  async send(
    notification: AnyDatabaseNotification<Config>,
    context: JsonObject,
  ): Promise<EmailTemplate> {
    const template = await this.templateRenderer.render(notification, context);
    const recipientEmail = await this.getRecipientEmail(notification);
    const attachments = notification.attachments?.length
      ? await this.readAttachments(notification.attachments)
      : undefined;

    await this.emailProvider.send({
      to: recipientEmail,
      subject: template.subject,
      html: template.body,
      attachments,
    });

    return template;
  }

  private async readAttachments(attachments: StoredAttachment[]): Promise<EmailAttachment[]> {
    const emailAttachments: EmailAttachment[] = [];

    for (const attachment of attachments) {
      emailAttachments.push({
        filename: attachment.filename,
        contentType: attachment.contentType,
        content: await attachment.file.read(),
      });
    }

    return emailAttachments;
  }
}

export class MailgunAdapterFactory<Config extends BaseNotificationTypeConfig> {
  create<TemplateRenderer extends BaseEmailTemplateRenderer<Config>>(
    templateRenderer: TemplateRenderer,
    enqueueNotifications: boolean,
    config: MailgunConfig,
  ): MailgunAdapter<TemplateRenderer, Config> {
    return new MailgunAdapter(
      templateRenderer,
      enqueueNotifications,
      new MailgunEmailProvider(config),
    );
  }
}
