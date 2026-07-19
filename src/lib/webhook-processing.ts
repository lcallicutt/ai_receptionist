import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";

export type WebhookOutcome =
  | { kind: "duplicate" }
  | { kind: "recorded"; webhookEventId: string };

/**
 * Shared webhook bookkeeping: idempotency-key dedupe + event row creation.
 * Callers verify the provider signature BEFORE calling this.
 */
export async function recordWebhookEvent(args: {
  provider: string;
  eventKind: string;
  providerEventId: string;
  organizationId: string | null;
}): Promise<WebhookOutcome> {
  const db = await getDb();
  const idempotencyKey = `${args.provider}:${args.providerEventId}`;
  const existing = await db
    .select({ id: schema.webhookEvents.id })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing[0]) return { kind: "duplicate" };

  const webhookEventId = newId("whe");
  await db.insert(schema.webhookEvents).values({
    id: webhookEventId,
    organizationId: args.organizationId,
    provider: args.provider,
    eventKind: args.eventKind,
    providerEventId: args.providerEventId,
    idempotencyKey,
    status: "processing",
    signatureValid: true,
    attempts: 1,
  });
  return { kind: "recorded", webhookEventId };
}

export async function markWebhookProcessed(webhookEventId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.webhookEvents)
    .set({ status: "processed", processedAt: new Date() })
    .where(eq(schema.webhookEvents.id, webhookEventId));
}

export async function markWebhookFailed(webhookEventId: string, error: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.webhookEvents)
    .set({ status: "failed", error })
    .where(eq(schema.webhookEvents.id, webhookEventId));
}

export async function logInvalidSignature(provider: string, eventKind: string): Promise<void> {
  const db = await getDb();
  await db.insert(schema.webhookEvents).values({
    id: newId("whe"),
    provider,
    eventKind,
    idempotencyKey: `${provider}:invalid:${newId("x")}`,
    status: "invalid_signature",
    signatureValid: false,
  });
}
