import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { callEventSchema, ingestCallEvent, resolveOrgByPhoneNumber } from "@/lib/ingestion";

/**
 * Sample provider webhook — demonstrates the platform's webhook contract:
 * HMAC signature verification, idempotent processing via provider event IDs,
 * fast acknowledgment, and PII-redacted event logging. Real provider routes
 * (Twilio, Retell) follow this same pattern in Phase 5.
 *
 * Headers:
 *   x-sample-signature: hex HMAC-SHA256 of the raw body, keyed with
 *                       SAMPLE_WEBHOOK_SECRET
 *   x-sample-event-id:  unique provider event id (idempotency key)
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SAMPLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "sample webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-sample-signature") ?? "";
  const eventId = request.headers.get("x-sample-event-id") ?? "";
  if (!eventId || eventId.length > 128) {
    return NextResponse.json({ error: "missing event id" }, { status: 400 });
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  const signatureValid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);

  const db = await getDb();
  const idempotencyKey = `sample:${eventId}`;

  if (!signatureValid) {
    await db
      .insert(schema.webhookEvents)
      .values({
        id: newId("whe"),
        provider: "sample",
        eventKind: "incoming_call",
        providerEventId: eventId,
        idempotencyKey: `${idempotencyKey}:invalid:${newId("x")}`,
        status: "invalid_signature",
        signatureValid: false,
      });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Idempotency: a previously-seen event id is acknowledged without reprocessing.
  const existing = await db
    .select({ id: schema.webhookEvents.id, status: schema.webhookEvents.status })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing[0]) {
    return NextResponse.json({ status: "duplicate", eventId }, { status: 200 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = callEventSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", detail: parsed.error.issues.map((i) => i.message) },
      { status: 422 },
    );
  }

  const organizationId = await resolveOrgByPhoneNumber(parsed.data.toNumber);
  if (!organizationId) {
    await db.insert(schema.webhookEvents).values({
      id: newId("whe"),
      provider: "sample",
      eventKind: "incoming_call",
      providerEventId: eventId,
      idempotencyKey,
      status: "failed",
      signatureValid: true,
      error: "no tenant owns the called number",
    });
    return NextResponse.json({ error: "unknown destination number" }, { status: 404 });
  }

  const webhookEventId = newId("whe");
  await db.insert(schema.webhookEvents).values({
    id: webhookEventId,
    organizationId,
    provider: "sample",
    eventKind: "incoming_call",
    providerEventId: eventId,
    idempotencyKey,
    status: "processing",
    signatureValid: true,
    attempts: 1,
  });

  try {
    const result = await ingestCallEvent(organizationId, parsed.data);
    await db
      .update(schema.webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(schema.webhookEvents.id, webhookEventId));
    return NextResponse.json({ status: "processed", ...result }, { status: 200 });
  } catch (err) {
    await db
      .update(schema.webhookEvents)
      .set({ status: "failed", error: err instanceof Error ? err.message : "unknown error" })
      .where(eq(schema.webhookEvents.id, webhookEventId));
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
