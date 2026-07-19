import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { ingestCallEvent, resolveOrgByPhoneNumber, type CallEvent } from "@/lib/ingestion";
import {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
  logInvalidSignature,
} from "@/lib/webhook-processing";

/**
 * Retell AI webhook — receives call lifecycle events. We process
 * `call_ended` / `call_analyzed` (the completed-call payload with transcript
 * and recording) and acknowledge everything else fast.
 *
 * Signature: x-retell-signature = hex HMAC-SHA256 of the raw body keyed
 * with RETELL_WEBHOOK_SECRET.
 */

const retellPayloadSchema = z.object({
  event: z.string(),
  call: z.object({
    call_id: z.string(),
    from_number: z.string().optional(),
    to_number: z.string().optional(),
    direction: z.string().optional(),
    call_status: z.string().optional(),
    start_timestamp: z.number().optional(),
    end_timestamp: z.number().optional(),
    disconnection_reason: z.string().optional(),
    transcript_object: z
      .array(z.object({ role: z.string(), content: z.string() }))
      .optional(),
    recording_url: z.string().optional(),
    call_analysis: z
      .object({
        call_summary: z.string().optional(),
        user_sentiment: z.string().optional(),
        call_successful: z.boolean().optional(),
      })
      .optional(),
  }),
});

function mapOutcome(payload: z.infer<typeof retellPayloadSchema>): CallEvent["outcome"] {
  const reason = payload.call.disconnection_reason ?? "";
  if (reason === "dial_no_answer" || reason === "dial_busy") return "caller_disconnected";
  if (payload.call.call_analysis?.call_successful === false) return "follow_up_required";
  return "lead_captured";
}

export async function POST(request: NextRequest) {
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "retell webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    await logInvalidSignature("retell", "call_event");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = retellPayloadSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 422 });
  }
  const payload = parsed.data;

  // Only completed-call events carry ingestable data; acknowledge the rest.
  if (payload.event !== "call_ended" && payload.event !== "call_analyzed") {
    return NextResponse.json({ status: "ignored", event: payload.event }, { status: 200 });
  }

  const toNumber = payload.call.to_number;
  const fromNumber = payload.call.from_number;
  if (!toNumber || !fromNumber) {
    return NextResponse.json({ error: "missing numbers" }, { status: 422 });
  }
  const organizationId = await resolveOrgByPhoneNumber(toNumber);
  if (!organizationId) {
    return NextResponse.json({ error: "unknown destination number" }, { status: 404 });
  }

  const outcome = await recordWebhookEvent({
    provider: "retell",
    eventKind: payload.event,
    providerEventId: `${payload.call.call_id}:${payload.event}`,
    organizationId,
  });
  if (outcome.kind === "duplicate") {
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }

  try {
    const startedAt = payload.call.start_timestamp
      ? new Date(payload.call.start_timestamp)
      : new Date();
    const endedAt = payload.call.end_timestamp ? new Date(payload.call.end_timestamp) : startedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
    );
    const sentimentRaw = payload.call.call_analysis?.user_sentiment?.toLowerCase();
    const sentiment =
      sentimentRaw === "positive" || sentimentRaw === "negative" ? sentimentRaw : "neutral";

    const event: CallEvent = {
      providerCallId: payload.call.call_id,
      provider: "retell",
      fromNumber,
      toNumber,
      startedAt,
      durationSeconds,
      status: durationSeconds > 0 ? "completed" : "missed",
      outcome: durationSeconds > 0 ? mapOutcome(payload) : "follow_up_required",
      sentiment,
      urgency: null,
      caller: null,
      reasonForCalling: null,
      requestedService: null,
      transcript: (payload.call.transcript_object ?? []).map((t) => ({
        role: t.role === "agent" ? ("assistant" as const) : ("caller" as const),
        text: t.content,
      })),
      summary: payload.call.call_analysis?.call_summary ?? null,
      smsSummary: null,
      qualificationAnswers: [],
      matchedScoringSignals: [],
      disqualified: false,
      recording: payload.call.recording_url
        ? { storageRef: payload.call.recording_url, providerRecordingId: payload.call.call_id }
        : null,
    };

    const result = await ingestCallEvent(organizationId, event);
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
