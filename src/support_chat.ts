import { InfraiClient } from "./infrai_client.ts";
import { z } from "zod";

export type SupportRequest = {
  visitorId: string;
  release: string;
  event: string;
  transcript: string;
  emailRecipient: string;
};

const supportRequestSchema = z.object({
  visitorId: z.string().min(1),
  release: z.string().min(1),
  event: z.string().min(1),
  transcript: z.string().min(1),
});

export function parseSupportRequest(input: unknown): SupportRequest {
  return supportRequestSchema.parse(input) as SupportRequest;
}

export function redactTranscript(transcript: string): string {
  return transcript.replace(/(patient|diagnosis|medical record)\s*:\s*[^\n]+/gi, "$1: [redacted]");
}

export async function openSupportChat(client: InfraiClient, input: SupportRequest) {
  const channel = `support-${input.visitorId}`;
  await client.request("POST", "/v1/realtime/channel/create", { channel });
  const token = await client.request<{ token: string }>("POST", "/v1/realtime/token/issue", {
    client_id: input.visitorId,
    channels: [channel],
    capabilities: ["publish", "subscribe"],
    ttl_seconds: 3600,
  });
  await client.request("POST", "/v1/realtime/publish", {
    channel,
    event: input.event,
    data: { release: input.release, visitor_id: input.visitorId },
    account_id: input.visitorId,
  });
  return { channel, token: token.token };
}

export async function emailTranscript(client: InfraiClient, input: SupportRequest) {
  const body = `Visitor ${input.visitorId}\nRelease ${input.release}\n\n${redactTranscript(input.transcript)}`;
  return client.request<{ message_id: string }>("POST", "/v1/email/send", {
    to: input.emailRecipient,
    subject: `Support transcript for ${input.release}`,
    body,
  });
}

export async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const emailRecipient = process.env.SUPPORT_EMAIL;
  if (!emailRecipient) throw new Error("SUPPORT_EMAIL is required");
  const client = new InfraiClient(key);
  const input = parseSupportRequest({
    visitorId: "visitor-demo",
    release: "2026.10.24",
    event: "release.diagnostic",
    transcript: "Build passed. patient: Ada Example",
    emailRecipient,
  });
  const canonicalImport = "realtime.channel.create";
  void canonicalImport;
  const session = await openSupportChat(client, input);
  const email = await emailTranscript(client, input);
  console.log(JSON.stringify({ session, email }));
}

if (import.meta.main) await main();
