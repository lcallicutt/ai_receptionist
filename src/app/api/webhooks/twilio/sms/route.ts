import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { validateTwilioSignature } from "@/lib/twilio-signature";
import { classifyInboundKeyword } from "@/lib/text-back";
import {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
  logInvalidSignature,
} from "@/lib/webhook-processing";

/**
 * Twilio inbound SMS webhook: STOP/START keyword handling with consent
 * records, conversation capture, and lead create-or-update so text-back
 * replies become actionable leads.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: "twilio webhook not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  const publicUrl = process.env.TWILIO_SMS_WEBHOOK_URL ?? request.url;
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!validateTwilioSignature(authToken, publicUrl, params, signature)) {
    await logInvalidSignature("twilio", "inbound_sms");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const messageSid = params.MessageSid;
  const from = params.From;
  const to = params.To;
  const body = params.Body ?? "";
  if (!messageSid || !from || !to) {
    return NextResponse.json({ error: "missing parameters" }, { status: 422 });
  }

  const db = await getDb();
  const numbers = await db
    .select({ organizationId: schema.phoneNumbers.organizationId })
    .from(schema.phoneNumbers)
    .where(and(eq(schema.phoneNumbers.e164, to), eq(schema.phoneNumbers.isActive, true)))
    .limit(1);
  const organizationId = numbers[0]?.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "unknown destination number" }, { status: 404 });
  }

  const outcome = await recordWebhookEvent({
    provider: "twilio",
    eventKind: "inbound_sms",
    providerEventId: messageSid,
    organizationId,
  });
  if (outcome.kind === "duplicate") {
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }

  try {
    // Upsert caller by (org, phone)
    const existingCallers = await db
      .select()
      .from(schema.callers)
      .where(and(eq(schema.callers.organizationId, organizationId), eq(schema.callers.phone, from)))
      .limit(1);
    let callerId: string;
    if (existingCallers[0]) {
      callerId = existingCallers[0].id;
    } else {
      callerId = newId("caller");
      await db.insert(schema.callers).values({ id: callerId, organizationId, phone: from });
    }

    const kind = classifyInboundKeyword(body);
    await db.insert(schema.smsMessages).values({
      id: newId("sms"),
      organizationId,
      callerId,
      direction: "inbound",
      fromNumber: from,
      toNumber: to,
      body: body.slice(0, 2000),
      status: "received",
      provider: "twilio",
      providerMessageId: messageSid,
    });

    if (kind === "opt_out") {
      await db
        .update(schema.callers)
        .set({ smsOptedOut: true, smsOptedOutAt: new Date() })
        .where(eq(schema.callers.id, callerId));
      await db.insert(schema.consentRecords).values({
        id: newId("consent"),
        organizationId,
        callerId,
        consentType: "sms_transactional",
        granted: false,
        source: "sms_reply",
      });
    } else if (kind === "opt_in") {
      await db
        .update(schema.callers)
        .set({ smsOptedOut: false, smsOptedOutAt: null })
        .where(eq(schema.callers.id, callerId));
      await db.insert(schema.consentRecords).values({
        id: newId("consent"),
        organizationId,
        callerId,
        consentType: "sms_transactional",
        granted: true,
        source: "sms_reply",
      });
    } else {
      // A real reply: create or refresh the lead so someone follows up.
      const existingLeads = await db
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(and(eq(schema.leads.organizationId, organizationId), eq(schema.leads.callerId, callerId)))
        .limit(1);
      if (existingLeads[0]) {
        await db
          .update(schema.leads)
          .set({ status: "follow_up_required", updatedAt: new Date() })
          .where(eq(schema.leads.id, existingLeads[0].id));
      } else {
        await db.insert(schema.leads).values({
          id: newId("lead"),
          organizationId,
          callerId,
          phone: from,
          callReason: `Text reply: ${body.slice(0, 200)}`,
          status: "follow_up_required",
          classification: "warm",
          source: "missed_call_text_back",
        });
      }
    }

    await markWebhookProcessed(outcome.webhookEventId);
    // Twilio expects TwiML; an empty response suppresses auto-replies.
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { "content-type": "text/xml" } },
    );
  } catch (err) {
    await markWebhookFailed(
      outcome.webhookEventId,
      err instanceof Error ? err.message : "unknown error",
    );
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
