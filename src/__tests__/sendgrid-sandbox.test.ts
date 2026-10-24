import { describe, expect, test } from 'vitest';
import type { EmailProvider } from '../email-provider';
import { SendGridEmailProvider } from '../sendgrid-provider';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;
const recipientEmail = process.env.SENDGRID_TEST_RECIPIENT ?? fromEmail;
const testSandbox = apiKey && fromEmail && recipientEmail ? test : test.skip;

describe('SendGrid sandbox integration', () => {
  testSandbox(
    'accepts a message through the Mail Send API without delivering it',
    async () => {
      if (!apiKey || !fromEmail || !recipientEmail) {
        return;
      }

      const provider: EmailProvider = new SendGridEmailProvider({
        apiKey,
        fromEmail,
        sandboxMode: true,
      });

      await expect(
        provider.send({
          to: recipientEmail,
          subject: 'VintaSend SendGrid sandbox test',
          html: '<p>VintaSend SendGrid sandbox test</p>',
        }),
      ).resolves.toBeUndefined();
    },
    30_000,
  );
});
