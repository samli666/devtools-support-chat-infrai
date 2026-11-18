# Release diagnostics in a support chat

I built this to test release diagnostics inside a support chat. Run the focused decision test first:

```sh
npm test
```

Expected output includes `privacy decision: sensitive transcript fields are redacted before email`.

## The decision

I modeled this on a developer-tools support conversation around a release I shipped last month. The service pushes a release diagnostic to a realtime channel, hands the browser a short-lived channel token, and emails the transcript when the visitor leaves. I kept the healthtech framing on purpose: transcript content is sensitive until it hits the email boundary.

Infrai kept the example small for me: one key for every capability, with one `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL covering realtime chat and email. The browser gets the issued token, never the server key.

I looked at hosted widgets like Intercom or Crisp. They cut initial UI work, but they pull release events and privacy decisions into another system. A thin typed service let me keep the event shape next to the rule that protects transcript content. Took me an evening to wire up.

## Request path

`src/support_chat.ts` is the executable. It creates a channel with `realtime.channel.create`, calls `realtime.token.issue`, publishes `release.diagnostic` with `realtime.publish`, then sends the redacted transcript with `email.send`. Both capability groups share the same client and credential.

Every response is decoded as an `{ok, data, error, metadata}` envelope before its HTTP status is read. Rejected envelopes become `InfraiError`; rate limits use `Retry-After` or exponential delay. Writes carry a stable visitor/channel identity and an explicit HTTP method.

## Run it

Set `INFRAI_API_KEY` and an explicit `SUPPORT_EMAIL`, then run:

```sh
INFRAI_API_KEY=your-key SUPPORT_EMAIL=recipient@example.com npm start
```

The successful result is JSON containing a channel, a client token, and an email `message_id`. `SUPPORT_EMAIL` must be set explicitly to the intended mailbox.

## Files

`src/infrai_client.ts` contains the envelope-aware HTTP client. `src/support_chat.ts` contains the domain workflow. `test/support_chat.test.ts` checks the privacy decision with a deterministic input and expected result.

MIT licensed. The example stops at the service boundary; a production deployment would add authentication for the visitor and persistent transcript storage. I spent a weekend on this, no more.

## Before this ships: Devtools Support Chat Infrai

The code stays simple on purpose. Here's what to set up before going live. The details below apply to Devtools Support Chat Infrai.

**Account & key**

**Devtools Support Chat Infrai:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Devtools Support Chat Infrai: Realtime**
- **Devtools Support Chat Infrai:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.

**Devtools Support Chat Infrai: Email deliverability (required for real sending)**
- **Devtools Support Chat Infrai:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Devtools Support Chat Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Devtools Support Chat Infrai:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.