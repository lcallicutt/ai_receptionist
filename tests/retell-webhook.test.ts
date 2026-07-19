/**
 * Retell webhook route tests against a real (in-memory PGlite) database:
 * signature verification, event mapping into the ingestion pipeline
 * (transcript, recording, usage), idempotency, and non-terminal event skip.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";

process.env.PGLITE_DATA_DIR = "memory://retell-webhook";
process.env.RETELL_WEBHOOK_SECRET = "retell-test-secret";
delete process.env.DATABASE_URL;

import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { POST } from "@/app/api/webhooks/retell/route";

const ORG_PHONE = "+15558880000";
let orgId: string;

function makeRequest(body: object, opts: { badSignature?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const signature = opts.badSignature
    ? "deadbeef"
    : createHmac("sha256", "retell-test-secret").update(raw).digest("hex");
  return new Request("http://localhost/api/webhooks/retell", {
    method: "POST",
    body: raw,
    headers: { "content-type": "application/json", "x-retell-signature": signature },
  });
}

const CALL_ENDED = {
  event: "call_ended",
  call: {
    call_id: "retell-call-1",
    from_number: "+15551230001",
    to_number: ORG_PHONE,
    direction: "inbound",
    call_status: "ended",
    start_timestamp: Date.parse("2026-07-18T16:00:00Z"),
    end_timestamp: Date.parse("2026-07-18T16:03:30Z"),
    transcript_object: [
      { role: "agent", content: "Thank you for calling!" },
      { role: "user", content: "Hi, I need some help." },
    ],
    recording_url: "https://recordings.retellai.example/retell-call-1.wav",
    call_analysis: {
      call_summary: "Caller asked for help; details captured.",
      user_sentiment: "Positive",
      call_successful: true,
    },
  },
};

beforeAll(async () => {
  const db = await getDb();
  orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "Retell Test Org",
    slug: `retell-test-${orgId}`,
    industry: "other",
  });
  await db.insert(schema.phoneNumbers).values({
    id: newId("pn"),
    organizationId: orgId,
    e164: ORG_PHONE,
    provider: "twilio",
  });
});

describe("retell webhook", () => {
  it("rejects invalid signatures", async () => {
    const res = await POST(makeRequest(CALL_ENDED, { badSignature: true }) as never);
    expect(res.status).toBe(401);
  });

  it("acknowledges non-terminal events without ingesting", async () => {
    const res = await POST(
      makeRequest({ event: "call_started", call: { call_id: "x1" } }) as never,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ignored");
  });

  it("ingests a completed call with transcript, recording, and usage", async () => {
    const res = await POST(makeRequest(CALL_ENDED) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; callRecordId: string };
    expect(body.status).toBe("processed");

    const db = await getDb();
    const calls = await db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.id, body.callRecordId));
    expect(calls[0]?.provider).toBe("retell");
    expect(calls[0]?.durationSeconds).toBe(210);
    expect(calls[0]?.sentiment).toBe("positive");

    const transcripts = await db
      .select()
      .from(schema.callTranscripts)
      .where(eq(schema.callTranscripts.callRecordId, body.callRecordId));
    expect(transcripts[0]?.segments).toHaveLength(2);
    expect(transcripts[0]?.segments[0]?.role).toBe("assistant");

    const recordings = await db
      .select()
      .from(schema.callRecordings)
      .where(eq(schema.callRecordings.callRecordId, body.callRecordId));
    expect(recordings[0]?.storageRef).toContain("retell-call-1.wav");

    const usage = await db
      .select()
      .from(schema.usageRecords)
      .where(eq(schema.usageRecords.callRecordId, body.callRecordId));
    expect(usage[0]?.usageType).toBe("voice_minutes");
    expect(Number(usage[0]?.quantity)).toBe(4); // 210s → 4 min
  });

  it("deduplicates repeated deliveries of the same call event", async () => {
    const res = await POST(makeRequest(CALL_ENDED) as never);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("duplicate");
  });
});
