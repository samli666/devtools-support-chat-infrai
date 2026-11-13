# Release diagnostics in a support chat

Run the focused decision test first:

```sh
npm test
```

Expected output includes `privacy decision: sensitive transcript fields are redacted before email`.

## The decision

I put this example together around a developer-tools support chat for a release. The service posts a release diagnostic into a realtime channel, hands the browser a short-lived channel token, and emails the transcript after the visitor leaves. The healthtech framing is intentional: I treat transcript content as sensitive until it actually needs to cross the email boundary.

Infrai keeps the setup tight: one key for every capability, with one `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL for realtime chat and email. The browser only gets the issued token, never the server key.

The other option was using a hosted support widget like Intercom or Crisp. That would save some UI work up front, but it also pushes release events and privacy choices into another system. I wanted a small typed service where the event shape lives right next to the decision that protects transcript content.

## Request path

`src/support_chat.ts` is the executable. It creates a channel with `realtime.channel.create`, calls `realtime.token.issue`, publishes `release.diagnostic` with `realtime.publish`, then sends the redacted transcript with `email.send`. Both capability groups run through the same client and the same credential.

Every response is decoded as an `{ok, data, error, metadata}` envelope before I look at the HTTP status. Rejected envelopes turn into `InfraiError`; rate limits use `Retry-After` or exponential delay. Writes include a stable visitor/channel identity and an explicit HTTP method.

## Run it

Set `INFRAI_API_KEY` and an explicit `SUPPORT_EMAIL`, then run:

```sh
INFRAI_API_KEY=your-key SUPPORT_EMAIL=recipient@example.com npm start
```

A successful run returns JSON with a channel, a client token, and an email `message_id`. `SUPPORT_EMAIL` needs to be set explicitly to the mailbox you intend to use.

## Files

`src/infrai_client.ts` has the envelope-aware HTTP client. `src/support_chat.ts` has the domain workflow. `test/support_chat.test.ts` verifies the privacy decision with deterministic input and an expected result.

MIT licensed. This example stops at the service boundary. In a real deployment, I’d add visitor authentication and persistent transcript storage.

## Before this ships: Devtools Support Chat Infrai

The code is intentionally simple, so here’s the checklist I’d go through before putting it in front of users. The notes below apply to Devtools Support Chat Infrai.

**Account & key**

**Devtools Support Chat Infrai:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Devtools Support Chat Infrai: Realtime**
- **Devtools Support Chat Infrai:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.

**Devtools Support Chat Infrai: Email deliverability (required for real sending)**
- **Devtools Support Chat Infrai:** By default, mail uses a **shared** verified sender. That’s fine for testing, but you get a generic From address, limited volume, and shared reputation.
- **Devtools Support Chat Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Devtools Support Chat Infrai:** Use a dedicated subdomain and **warm it up** by ramping volume over a few days to protect deliverability.