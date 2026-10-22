# Resend transactional email

[Documentation home](README.md) · [Deployment](../DEPLOY.md)

Account verification, password resets and invitations use the existing
`EmailService` → email queue → `EmailSenderJob` → configured email driver. Set `EMAIL_DRIVER=RESEND` to send through Resend's
REST API using the existing Resend API client. No SMTP credentials are needed
for this mode. `SMTP` remains available for other mail providers.
The separate `EMAILING_DOMAIN_DRIVER=RESEND` feature manages workspace emailing
domains/campaigns; it is not required to deliver platform account emails.

## Configuration

Set these values in the Coolify resource's secret environment settings, on
both server and worker. Both maintained Compose copies now pass them through.

| Variable | Value |
| --- | --- |
| `EMAIL_DRIVER` | `RESEND` |
| `RESEND_API_KEY` | The API key from the secret store |
| `EMAIL_FROM_ADDRESS` | An address on your verified sending domain, such as `noreply@example.com` |
| `EMAIL_FROM_NAME` | `A2E Suite` |

For the optional `EMAIL_DRIVER=SMTP` mode, the Compose definition uses `EMAIL_SMTP_PASSWORD` when supplied and otherwise
uses `RESEND_API_KEY` as the SMTP password. For a process started directly from
the server package, set `EMAIL_SMTP_PASSWORD` explicitly: that fallback is a
Compose interpolation, not a server config alias. Keep secrets out of source,
`.env.example`, logs and rendered `docker compose config` output. Use
`docker compose config --quiet` to validate without printing resolved secrets.

Port 587 requires STARTTLS. Ports 465 and 2465 use implicit TLS. Certificate
validation stays enabled. `EMAIL_SMTP_NO_TLS=true` is an explicit plaintext
option for local mail-capture servers, not for Resend.

Keep `IS_EMAIL_VERIFICATION_REQUIRED=false` until a real account can receive
and follow the app's verification/reset/invitation links. Enabling it while
delivery is unavailable can trap new accounts. `EMAIL_DRIVER=LOGGER` remains
the deployment default when no mail provider is configured; logger output is
not proof of delivery.

## Domain verification

Use Resend's domain API/dashboard to obtain the current DNS records; do not
invent DKIM values or copy another domain's records. Add the required DKIM TXT,
SPF TXT and sending-MX records at the authoritative DNS provider. These records
are typically on `resend._domainkey` and the `send` subdomain. Do not replace
the domain's existing root MX records for mailbox hosting.

Ask Resend to reverify after publishing the records. Confirm the domain reports
`verified` before using it as the production sender. A valid API key and an
authenticated SMTP connection do not verify a domain.

For the current setup's public DNS status and required records, see the
[dated email phase report](plan/phases/resend-email-report.md). The local
credential/configuration file is ignored by Git and has mode 0600; it must be
installed in the deployment secret environment, not copied into an image.

## Verification and delivery semantics

1. Check native templates with the focused server email tests.
2. Verify HTTPS API authentication and the sending domain.
3. Send a disposable message to Resend's official `delivered@resend.dev`
   simulator, using the test sender where supported. This consumes a provider
   sending allowance; it does not prove delivery to a human inbox.
4. Verify a real signup, reset and invitation on a disposable account through
   the deployed server and worker. Check the provider event and recipient inbox,
   then follow the link and verify the resulting authorized workspace/account.
5. Exercise a provider failure. The selected driver awaits provider acknowledgement
   and propagates errors, so the existing queue can apply its retry limit.
   Provider acceptance is not proof of inbox delivery.

For REST emails, the native queue assigns a stable message ID before enqueueing.
Worker retries derive the same hashed `Idempotency-Key` from that ID; Resend
retains keys for 24 hours. Independent sends get different IDs. HTTPS calls
have a 15-second timeout and provider failures propagate to the existing queue.
This is bounded provider deduplication, not an exactly-once guarantee.

The REST adapter supports the native account templates' text/HTML bodies,
address lists, reply-to, string headers, and inline string/Buffer attachments.
File/URL/stream attachments, raw MIME and custom envelopes fail explicitly;
use the existing SMTP mode for those specialized message formats.

Provider references: [REST send API](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[SMTP setup](https://resend.com/docs/send-with-smtp),
[verified domains](https://resend.com/docs/dashboard/domains/introduction),
[test addresses](https://resend.com/docs/dashboard/emails/send-test-emails).
