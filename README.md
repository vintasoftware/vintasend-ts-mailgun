# VintaSend Mailgun Adapter

A VintaSend email notification adapter using [Mailgun](https://www.mailgun.com/) for reliable email delivery with attachment support.

## Installation

```bash
npm install vintasend-mailgun
```

## Configuration

```typescript
import { MailgunAdapterFactory } from 'vintasend-mailgun';

const adapter = new MailgunAdapterFactory().create(
   templateRenderer,
   false, // enqueueNotifications
   {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      fromEmail: 'noreply@example.com',
      fromName: 'My App', // optional
   }
);
```

### Configuration Options

```typescript
interface MailgunConfig {
   apiKey: string;        // Mailgun API key
   domain: string;        // Mailgun domain
   fromEmail: string;     // Default sender email address
   fromName?: string;     // Optional sender name
   baseUrl?: string;      // Optional Mailgun API base URL
}
```

## Usage

### Basic Email

```typescript
await notificationService.createNotification({
   userId: '123',
   notificationType: 'EMAIL',
   contextName: 'welcome',
   contextParameters: { firstName: 'John' },
   title: 'Welcome!',
   bodyTemplate: '/templates/welcome.pug',
   subjectTemplate: '/templates/subjects/welcome.pug',
   sendAfter: new Date(),
});
```

### Email with Attachments

```typescript
import { readFile } from 'fs/promises';

await notificationService.createNotification({
   userId: '123',
   notificationType: 'EMAIL',
   contextName: 'invoice',
   contextParameters: { invoiceNumber: 'INV-001' },
   title: 'Your invoice',
   bodyTemplate: '/templates/invoice.pug',
   subjectTemplate: '/templates/subjects/invoice.pug',
   sendAfter: new Date(),
   attachments: [
      {
         file: await readFile('./invoice.pdf'),
         filename: 'invoice.pdf',
         contentType: 'application/pdf',
      },
   ],
});
```

### One-Off Notifications

```typescript
await notificationService.createOneOffNotification({
   emailOrPhone: 'customer@example.com',
   firstName: 'Jane',
   lastName: 'Smith',
   notificationType: 'EMAIL',
   contextName: 'order-confirmation',
   contextParameters: { orderNumber: '12345' },
   title: 'Order Confirmation',
   bodyTemplate: '/templates/order-confirmation.pug',
   subjectTemplate: '/templates/subjects/order-confirmation.pug',
   sendAfter: new Date(),
});
```

## Features

- ✅ Email delivery via Mailgun API
- ✅ File attachments
- ✅ One-off notifications
- ✅ Scheduled notifications
- ✅ Custom sender name and email
- ✅ HTML email templates
- ✅ Multiple attachments per email

## Provider interface

The VintaSend adapter delegates email delivery to the provider-neutral `EmailProvider`
interface. Mailgun is the implementation currently supplied by the factory, so another
email provider can be added without changing the notification rendering flow.

```typescript
interface EmailProvider {
   readonly supportsAttachments: boolean;
   send(message: {
      to: string;
      subject: string;
      html: string;
      attachments?: Array<{
         filename: string;
         contentType: string;
         content: Uint8Array;
      }>;
   }): Promise<void>;
}
```

## API Reference

### MailgunAdapterFactory

```typescript
class MailgunAdapterFactory<Config extends BaseNotificationTypeConfig>
```

**Methods:**
- `create<TemplateRenderer>(templateRenderer, enqueueNotifications, config)` - Create adapter instance

### MailgunAdapter

**Properties:**
- `key: string | null` - Returns `'mailgun'`
- `notificationType: NotificationType` - Returns `'EMAIL'`
- `supportsAttachments: boolean` - Returns `true`

**Methods:**
- `send(notification, context): Promise<EmailTemplate>` - Render and send an email with optional attachments

### MailgunEmailProvider

The Mailgun provider implements `EmailProvider` and sends messages through the Mailgun REST API.

**Methods:**
- `send(message)` - Send a rendered email with optional attachments

### SendGridEmailProvider

The SendGrid provider also implements `EmailProvider`, but is not wired into
`MailgunAdapter` or `MailgunAdapterFactory`. It is available as a standalone implementation
for the SendGrid migration.

```typescript
interface SendGridConfig {
   apiKey: string;
   fromEmail: string;
   fromName?: string;
   baseUrl?: string;
   sandboxMode?: boolean;
}
```

When `sandboxMode` is enabled, SendGrid validates and accepts the message without delivering it.
Run the integration test with `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and optionally
`SENDGRID_TEST_RECIPIENT` configured in the environment:

```bash
npm run test:sendgrid:sandbox
```

## Environment Variables

```bash
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=mg.example.com
FROM_EMAIL=noreply@example.com
FROM_NAME=My Application
MAILGUN_BASE_URL=https://api.mailgun.net
```

## License

MIT