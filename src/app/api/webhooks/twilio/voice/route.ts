import { NextResponse, type NextRequest } from "next/server";
import { ingestCallEvent, resolveOrgByPhoneNumber } from "@/lib/ingestion";
import { validateTwilioSignature } from "@/lib/twilio-signature";
import {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
  logInvalidSignature,
} from "@/lib/webhook-processing";

/**
 * Twilio voice status callback. The AI conversation itself flows through the
 * voice provider (Retell); this endpoint captures telephony-level outcomes —
 * in particular unanswered/busy/failed calls, which feed missed-call
 * text-back in Phase 7.
 *
 * Signature: X-Twilio-Signature over the public URL + sorted form params,
 * keyed with TWILIO_AUTH_TOKEN.
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

  const publicUrl = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!validateTwilioSignature(authToken, publicUrl, params, signature)) {
    await logInvalidSignature("twilio", "voice_status");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const callSid = params.CallSid;
  const callStatus = params.CallStatus; // queued|ringing|in-progress|completed|busy|no-answer|failed|canceled
  const from = params.From;
  const to = params.To;
  if (!callSid || !from || !to) {
    return NextResponse.json({ error: "missing parameters" }, { status: 422 });
  }

  // Only terminal missed-call states are ingested here — answered calls are
  // ingested with full transcripts by the voice provider's webhook.
  const missedStates = new Set(["no-answer", "busy", "failed", "canceled"]);
  if (!callStatus || !missedStates.has(callStatus)) {
    return NextResponse.json({ status: "acknowledged", callStatus }, { status: 200 });
  }

  const organizationId = await resolveOrgByPhoneNumber(to);
  if (!organizationId) {
    return NextResponse.json({ error: "unknown destination number" }, { status: 404 });
  }

  const outcome = await recordWebhookEvent({
    provider: "twilio",
    eventKind: `voice_${callStatus}`,
    providerEventId: `${callSid}:${callStatus}`,
    organizationId,
  });
  if (outcome.kind === "duplicate") {
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }

  try {
    const result = await ingestCallEvent(organizationId, {
      providerCallId: callSid,
      provider: "twilio",
      fromNumber: from,
      toNumber: to,
      startedAt: new Date(),
      durationSeconds: 0,
      status: callStatus === "canceled" ? "abandoned" : "missed",
      outcome: "follow_up_required",
      sentiment: null,
      urgency: null,
      caller: null,
      reasonForCalling: `Missed call (${callStatus})`,
      requestedService: null,
      transcript: [],
      summary: null,
      smsSummary: null,
      qualificationAnswers: [],
      matchedScoringSignals: [],
      disqualified: false,
      recording: null,
    });
    await markWebhookProcessed(outcome.webhookEventId);
    return NextResponse.json({ status: "processed", callRecordId: result.callRecordId });
  } catch (err) {
    await markWebhookFailed(
      outcome.webhookEventId,
      err instanceof Error ? err.message : "unknown error",
    );
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
