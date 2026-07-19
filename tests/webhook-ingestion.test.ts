/**
 * Webhook ingestion tests against a real (in-memory PGlite) database:
 * signature verification, idempotent duplicate handling, tenant resolution
 * by phone number, and lead creation through the ingestion pipeline.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";

process.env.PGLITE_DATA_DIR = "memory://webhook-ingestion";
process.env.SAMPLE_WEBHOOK_SECRET = "test-webhook-secret";
delete process.env.DATABASE_URL;

import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { POST } from "@/app/api/webhooks/sample/route";

const ORG_PHONE = "+15559990000";
let orgId: string;

function makeRequest(body: object, eventId: string, opts: { badSignature?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const signature = opts.badSignature
    ? "deadbeef"
    : createHmac("sha256", "test-webhook-secret").update(raw).digest("hex");
  return new Request("http://localhost/api/webhooks/sample", {
    method: "POST",
    body: raw,
    headers: {
      "content-type": "application/json",
      "x-sample-signature": signature,
      "x-sample-event-id": eventId,
    },
  });
}

const SAMPLE_EVENT = {
  providerCallId: "prov-call-1",
  provider: "sample",
  fromNumber: "+15551112222",
  toNumber: ORG_PHONE,
  startedAt: "2026-07-18T12:00:00Z",
  durationSeconds: 120,
  status: "completed",
  outcome: "lead_captured",
  sentiment: "positive",
  urgency: "medium",
  caller: { name: "Webhook Tester" },
  reasonForCalling: "Service inquiry",
  requestedService: "Test service",
  transcript: [{ role: "assistant", text: "Hello!" }],
  summary: "Test summary",
  smsSummary: "Test SMS summary",
  qualificationAnswers: [{ question: "Q1", answer: "A1" }],
  matchedScoringSignals: [],
  disqualified: false,
};

beforeAll(async () => {
  const db = await getDb();
  orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "Webhook Test Org",
    slug: `webhook-test-${orgId}`,
    industry: "other",
  });
  await db.insert(schema.phoneNumbers).values({
    id: newId("pn"),
    organizationId: orgId,
    e164: ORG_PHONE,
    provider: "twilio",
  });
});

describe("sample webhook", () => {
  it("rejects an invalid signature", async () => {
    const res = await POST(
      makeRequest(SAMPLE_EVENT, "evt-bad-sig", { badSignature: true }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("processes a valid event: creates call, transcript, summary, and lead", async () => {
    const res = await POST(makeRequest(SAMPLE_EVENT, "evt-1") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; callRecordId: string; leadId: string };
    expect(body.status).toBe("processed");

    const db = await getDb();
    const calls = await db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.id, body.callRecordId));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.organizationId).toBe(orgId);

    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, body.leadId));
    expect(leads).toHaveLength(1);
    expect(leads[0]?.name).toBe("Webhook Tester");

    const transcripts = await db
      .select()
      .from(schema.callTranscripts)
      .where(eq(schema.callTranscripts.callRecordId, body.callRecordId));
    expect(transcripts).toHaveLength(1);
  });

  it("acknowledges duplicate event ids without creating duplicate records", async () => {
    const db = await getDb();
    const before = await db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.organizationId, orgId));

    const res = await POST(makeRequest(SAMPLE_EVENT, "evt-1") as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("duplicate");

    const after = await db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.organizationId, orgId));
    expect(after).toHaveLength(before.length);
  });

  it("returns 404 for a destination number no tenant owns", async () => {
    const res = await POST(
      makeRequest({ ...SAMPLE_EVENT, toNumber: "+15550009999" }, "evt-unknown-dest") as never,
    );
    expect(res.status).toBe(404);
  });

  it("does not create a lead for spam calls", async () => {
    const res = await POST(
      makeRequest(
        { ...SAMPLE_EVENT, outcome: "spam", providerCallId: "prov-spam" },
        "evt-spam",
      ) as never,
    );
    const body = (await res.json()) as { leadId: string | null };
    expect(body.leadId).toBeNull();
  });
});
