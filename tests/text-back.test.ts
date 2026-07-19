/**
 * Missed-call text-back tests against a real (in-memory PGlite) database:
 * queue path without a configured provider, opt-out suppression, cooldown
 * (one text per caller per window), disabled toggle, and STOP keyword
 * classification.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";

process.env.PGLITE_DATA_DIR = "memory://text-back";
delete process.env.DATABASE_URL;
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;

import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { maybeSendTextBack, classifyInboundKeyword } from "@/lib/text-back";

let orgId: string;

async function makeCaller(phone: string, overrides: Partial<typeof schema.callers.$inferInsert> = {}) {
  const db = await getDb();
  const id = newId("caller");
  await db.insert(schema.callers).values({ id, organizationId: orgId, phone, ...overrides });
  return id;
}

async function makeCall(callerId: string): Promise<string> {
  const db = await getDb();
  const id = newId("call");
  await db.insert(schema.callRecords).values({
    id,
    organizationId: orgId,
    callerId,
    direction: "inbound",
    status: "missed",
    fromNumber: "+15550000000",
    toNumber: "+15557770000",
    startedAt: new Date(),
  });
  return id;
}

beforeAll(async () => {
  const db = await getDb();
  orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "TextBack Org",
    slug: `textback-${orgId}`,
    industry: "home_services",
  });
  await db.insert(schema.businessProfiles).values({
    id: newId("bp"),
    organizationId: orgId,
    businessName: "TextBack Plumbing",
    textBackEnabled: true,
    textBackCooldownHours: 24,
  });
  await db.insert(schema.phoneNumbers).values({
    id: newId("pn"),
    organizationId: orgId,
    e164: "+15557770000",
    capabilities: { voice: true, sms: true },
  });
});

describe("missed-call text-back", () => {
  it("queues exactly one message with the rendered template", async () => {
    const callerId = await makeCaller("+15557771001");
    const outcome = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(outcome.status).toBe("queued"); // provider unconfigured → queued, never fake-sent

    const db = await getDb();
    const messages = await db
      .select()
      .from(schema.smsMessages)
      .where(and(eq(schema.smsMessages.callerId, callerId), eq(schema.smsMessages.isTextBack, true)));
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toContain("TextBack Plumbing");
  });

  it("enforces the cooldown — a second missed call does not double-text", async () => {
    const callerId = await makeCaller("+15557771002");
    const first = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(first.status).toBe("queued");
    const second = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(second).toEqual({ status: "skipped", reason: "cooldown active" });

    const db = await getDb();
    const messages = await db
      .select()
      .from(schema.smsMessages)
      .where(eq(schema.smsMessages.callerId, callerId));
    expect(messages).toHaveLength(1);
  });

  it("sends again once the cooldown has elapsed", async () => {
    const callerId = await makeCaller("+15557771003", {
      lastTextBackAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago > 24h cooldown
    });
    const outcome = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(outcome.status).toBe("queued");
  });

  it("never texts an opted-out caller", async () => {
    const callerId = await makeCaller("+15557771004", { smsOptedOut: true });
    const outcome = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(outcome).toEqual({ status: "skipped", reason: "caller opted out" });

    const db = await getDb();
    const messages = await db
      .select()
      .from(schema.smsMessages)
      .where(eq(schema.smsMessages.callerId, callerId));
    expect(messages).toHaveLength(0);
  });

  it("respects the tenant toggle", async () => {
    const db = await getDb();
    await db
      .update(schema.businessProfiles)
      .set({ textBackEnabled: false })
      .where(eq(schema.businessProfiles.organizationId, orgId));
    const callerId = await makeCaller("+15557771005");
    const outcome = await maybeSendTextBack(orgId, callerId, await makeCall(callerId));
    expect(outcome).toEqual({ status: "skipped", reason: "text-back disabled" });
    await db
      .update(schema.businessProfiles)
      .set({ textBackEnabled: true })
      .where(eq(schema.businessProfiles.organizationId, orgId));
  });
});

describe("inbound keyword classification", () => {
  it("recognizes opt-out keywords case-insensitively", () => {
    expect(classifyInboundKeyword("STOP")).toBe("opt_out");
    expect(classifyInboundKeyword("  stop ")).toBe("opt_out");
    expect(classifyInboundKeyword("Unsubscribe")).toBe("opt_out");
  });

  it("recognizes opt-in keywords", () => {
    expect(classifyInboundKeyword("START")).toBe("opt_in");
  });

  it("treats everything else as a message", () => {
    expect(classifyInboundKeyword("Yes I'd like to book an appointment")).toBe("message");
    expect(classifyInboundKeyword("please stop calling me at work, use my cell")).toBe("message");
  });
});
