# Resend email delivery phase report

## 2026-10-22 20:08 UTC — executor

**Task:** Native transactional email for the multi-workspace product · **Slice:** EMAIL-1 · **Claim:** partial; production delivery blocked by sender DNS.
**Changed:** await SMTP acknowledgement and propagate failure to the native worker; enforce STARTTLS/implicit TLS; pass matching email configuration through both Coolify Compose copies; provide setup documentation and focused delivery tests.
**Credential:** saved in ignored `.env.resend.local`, mode 0600; never included in source, examples or test fixtures. The file holds the prepared SMTP configuration. It is not automatically loaded into the running/deployed app. No production secrets or existing server environment were overwritten.
**Provider evidence:** Resend API authenticated successfully; domain `association2e.org` reported `failed`. SMTP authenticated on port 587 with STARTTLS required. Public nameservers are `ns1.vercel-dns.com` and `ns2.vercel-dns.com`; DKIM TXT, `send` MX and `send` TXT lookups returned `ENODATA`.

### Required public DNS records

These values were retrieved from the domain API. The DKIM value is a public DNS key, not the private API credential. Re-fetch records if the domain configuration changes.

| Type | Name under association2e.org | Value | Priority |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDOpw0vKTmrLc4n6LqVC5wvBIOQCF32ftP6GggOg4Uqii9JlrSxMc+ClqPMHb0AckaaJonS/uwnqJUJpXW1gCSnnCzu5Nfhm3AANrYNTYblghQ1prwWXBcH9IHeH+IedUqCirdB+dnDNHQ7ageTYCZesUy/IsVE8OHFhvsE+oe46QIDAQAB` | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

Do not replace root mailbox MX records. Vercel access is needed to publish these records, then trigger Resend verification. A Vercel connection was suggested but is not confirmed installed/connected. The Coolify resource URL/access is also needed to configure the live deployment and inspect its revision.

**Do not redo:** native email templates, queue, reset/invitation grants and existing SMTP driver selection. Required email verification remains disabled until delivery is proven. No database reset, migrations, image publication, DNS mutation or production rollout.
**Missing for tick:** verified sender domain, real recipient inbox and account links, running worker email job/retry proof, live deployment revision, browser journeys and same-domain workspace/ownership/quota acceptance.
**Next:** publish the three records using authorized Vercel access; reverify; apply the saved settings as deployment secrets; test real signup/reset/invitation through the worker. Continue SDW-2/SDW-3 separately; this report does not mark multi-workspace routing or quotas complete.

### Verification results

- `npx jest packages/twenty-server/src/engine/core-modules/email/__tests__/smtp-delivery.spec.ts packages/twenty-server/src/engine/core-modules/email/__tests__/email-driver.factory.spec.ts --config=packages/twenty-server/jest.config.mjs --runInBand` at root: **21 passed** across two suites. Native sender/job tests keep the promise pending until provider acknowledgement, propagate rejection, and permit retry. Transport tests cover required STARTTLS, implicit TLS and explicitly configured local plaintext.
- `npx tsgo -p tsconfig.json --noEmit` in twenty-server: **passed**.
- `npx oxlint --type-aware -c .oxlintrc.json` on the SMTP driver, factory and new test in twenty-server: **passed**, zero warnings/errors. `npx oxfmt` on those three files: **passed**.
- Node YAML parse/assertion: both Coolify copies are identical and parse; ten email settings match between server/worker; worker provisioning opt-out and server startup grace period are retained. Docker/Podman are not installed in this environment, so no container interpolation, image build or clean Compose deployment is claimed.
- Resend SMTP `verify()` using the saved credential on port 587 with `requireTLS=true`: **passed**. TLS certificate validation was retained.
- One non-personal test message via real SMTP, from Resend's test sender to its official delivery simulator: **accepted**, one accepted recipient and zero rejected. Provider message `01a1653a-4430-7d3b-8ede-2b941cc06b4a`; authenticated `GET /emails/:id` returned **`last_event=delivered`**. This proves simulated provider delivery only, not production-domain or human-inbox delivery. No account/reset tokens or credentials were in the message.
- Authenticated domain API and public DNS lookups: **failed production-domain verification confirmed**, with the missing records listed above. No DNS changes were attempted without access.
- Saved-credential scan of every modified/nonignored untracked file: **passed**, no credential leak. `.env.resend.local` remains Git-ignored and mode 0600.
- `node --test docs/scripts/check-docs.test.mjs`: **6 passed**. `node docs/scripts/check-docs.mjs` and `git diff --check`: **passed**.

Source references: [Resend SMTP setup](https://resend.com/docs/send-with-smtp),
[domain verification](https://resend.com/docs/dashboard/domains/introduction),
[official simulator addresses](https://resend.com/docs/dashboard/emails/send-test-emails).


## 2026-10-22 22:35 UTC — executor · EMAIL-2 Resend REST

**Task:** User-requested REST transport for native account emails · **Claim:** done-for-review for this slice; full multi-workspace product remains partial.
**Changed:** `EMAIL_DRIVER=RESEND` uses the existing Resend API client via the native factory/sender/worker. SMTP and LOGGER remain supported. Text/HTML, parsed recipient lists, reply-to, string headers and inline attachments are mapped explicitly; unsupported raw MIME/file/stream forms fail instead of disappearing. The queue assigns stable message IDs before enqueueing; retries reuse hashed REST idempotency keys. Existing domain/campaign REST calls remain compatible. HTTP calls have a 15-second timeout.
**Configuration:** saved private configuration now selects RESEND. Updated the ignored local server `.env` with the driver, saved key and configured sender while preserving unrelated settings, with mode 0600. Local runtime requires restart to pick these up; no production resource was changed. SMTP secrets are unnecessary in REST mode.
**Provider evidence:** rechecked API domain status: `association2e.org` is now **verified**, superseding the earlier failed status. No DNS changes were made by this agent. REST simulator message `01a165be-b6c4-7174-88fa-f260dfc27baa` was delivered, and repeating the same POST with the same key returned the same message ID. A second simulator test from the configured `noreply@association2e.org` sender, `01a165bf-8335-7176-8305-10f69bd460a4`, also reports **delivered**. No human inbox or account link was tested.
**Checks:** 31 tests passed across resend-delivery, smtp-delivery and email-driver.factory; 48 frontend auth tests passed across the existing eight targeted suites. The real server successful-sign-out and successful-session-workspace-binding integration suites passed **7 tests**, without resetting the database, and confirmed Nest startup with the new driver dependency. Server direct `npx tsgo -p tsconfig.json --noEmit` passed. Type-aware oxlint on ten touched server files passed with zero warnings/errors; oxfmt, documentation checker and `git diff --check` passed. Scanning all modified/nonignored untracked files found no saved credential. Integration startup still reports unavailable ClickHouse; audit persistence remains unverified.
**Commands:** root `npx jest <three email suite paths> --config=packages/twenty-server/jest.config.mjs --runInBand`; root focused frontend auth command as recorded in AUTH-1, same eight suites; in server `NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/auth/user-sessions/successful-sign-out.integration-spec.ts test/integration/graphql/suites/auth/user-sessions/successful-session-workspace-binding.integration-spec.ts --runInBand --silent`. Provider checks used authenticated POST/GET on Resend REST, with credentials read only from ignored local configuration and never printed.
**Limits:** Resend retains deduplication keys for 24 hours; legacy queued messages without IDs do not gain retroactive retry deduplication. No exactly-once delivery claim. No schema migration, Docker image build, production deployment or real browser/email-account journey was performed.
**Next:** production secret/config activation and actual signup/reset/invitation inbox journeys; complete SDW-2/SDW-3 routing/context and SDW-4 durable ownership/concurrency-safe quotas before release. Tests here do not prove the remaining lifecycle, role, invitation-capacity or two-live-tab acceptance matrix.
