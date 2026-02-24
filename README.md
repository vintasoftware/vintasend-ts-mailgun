# VintaSend Mailgun Adapter

A VintaSend email notification adapter using [Mailgun](https://www.mailgun.com/) for reliable email delivery with attachment support.

## Installation

```bash
npm install vintasend-mailgun mailgun.js form-data
```

## Configuration

```typescript
import { MailgunNotificationAdapterFactory } from 'vintasend-mailgun';

const adapter = new MailgunNotificationAdapterFactory().create(
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

## API Reference

### MailgunNotificationAdapterFactory

```typescript
class MailgunNotificationAdapterFactory<Config extends BaseNotificationTypeConfig>
```

**Methods:**
- `create<TemplateRenderer>(templateRenderer, enqueueNotifications, config)` - Create adapter instance

### MailgunNotificationAdapter

**Properties:**
- `key: string` - Returns `'mailgun'`
- `notificationType: NotificationType` - Returns `'EMAIL'`
- `supportsAttachments: boolean` - Returns `true`

**Methods:**
- `send(notification, context)` - Send an email with optional attachments

## Environment Variables

```bash
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=mg.example.com
FROM_EMAIL=noreply@example.com
FROM_NAME=My Application
```

## License

MIT