/**
 * CRM sync tests against a real (in-memory PGlite) database with a stubbed
 * fetch: webhook CRM success path, failure + error recording, retry after
 * failure, and signed payload shape.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";

process.env.PGLITE_DATA_DIR = "memory://crm-sync";
delete process.env.DATABASE_URL;
delete process.env.N8N_WEBHOOK_URL;

import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { encryptCredentials } from "@/lib/crypto";
import { syncLeadToCrm } from "@/lib/crm-sync";

let orgId: string;
let leadId: string;
const WEBHOOK_URL = "https://crm.example.test/webhooks/flownet";
const SECRET = "crm-signing-secret";

const fetchMock = vi.fn();

beforeAll(async () => {
  vi.stubGlobal("fetch", fetchMock);
  const db = await getDb();
  orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "CRM Test Org",
    slug: `crm-test-${orgId}`,
    industry: "other",
  });
  await db.insert(schema.businessProfiles).values({
    id: newId("bp"),
    organizationId: orgId,
    businessName: "CRM Test Business",
  });
  await db.insert(schema.crmConnections).values({
    id: newId("crm"),
    organizationId: orgId,
    provider: "webhook",
    webhookUrl: WEBHOOK_URL,
    encryptedCredentials: encryptCredentials({ secret: SECRET }),
    status: "connected",
  });
  leadId = newId("lead");
  await db.insert(schema.leads).values({
    id: leadId,
    organizationId: orgId,
    name: "Sync Tester",
    phone: "+15550001111",
    score: 80,
    classification: "hot",
    status: "new",
  });
  await db.insert(schema.leadAnswers).values({
    id: newId("la"),
    organizationId: orgId,
    leadId,
    questionPrompt: "What service?",
    answer: "Testing",
  });
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe("CRM sync", () => {
  it("marks the lead failed and records the error when the CRM is down", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 502 }));
    const outcome = await syncLeadToCrm(orgId, leadId);
    expect(outcome.status).toBe("failed");

    const db = await getDb();
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId));
    expect(leads[0]?.crmSyncStatus).toBe("failed");
    expect(leads[0]?.crmSyncError).toContain("502");

    const logs = await db
      .select()
      .from(schema.integrationLogs)
      .where(eq(schema.integrationLogs.relatedLeadId, leadId));
    expect(logs.some((l) => !l.success)).toBe(true);
  });

  it("retry after failure succeeds and stores the CRM record id", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ recordId: "crm-rec-42" }), { status: 200 }),
    );
    const outcome = await syncLeadToCrm(orgId, leadId);
    expect(outcome).toEqual({ status: "synced", crmRecordId: "crm-rec-42" });

    const db = await getDb();
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId));
    expect(leads[0]?.crmSyncStatus).toBe("synced");
    expect(leads[0]?.crmRecordId).toBe("crm-rec-42");
    expect(leads[0]?.crmSyncError).toBeNull();
  });

  it("sends a signed, well-formed payload", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await syncLeadToCrm(orgId, leadId);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WEBHOOK_URL);
    const body = String(init.body);
    const headers = init.headers as Record<string, string>;
    const expectedSig = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(headers["x-flownet-signature"]).toBe(expectedSig);

    const parsed = JSON.parse(body) as {
      event: string;
      lead: { flownetLeadId: string; name: string; qualificationAnswers: unknown[] };
    };
    expect(parsed.event).toBe("lead.updated"); // record id already stored
    expect(parsed.lead.flownetLeadId).toBe(leadId);
    expect(parsed.lead.name).toBe("Sync Tester");
    expect(parsed.lead.qualificationAnswers).toHaveLength(1);
  });

  it("skips gracefully when no CRM is connected", async () => {
    const db = await getDb();
    const otherOrg = newId("org");
    await db.insert(schema.organizations).values({
      id: otherOrg,
      name: "No CRM Org",
      slug: `no-crm-${otherOrg}`,
      industry: "other",
    });
    const otherLead = newId("lead");
    await db.insert(schema.leads).values({ id: otherLead, organizationId: otherOrg });
    const outcome = await syncLeadToCrm(otherOrg, otherLead);
    expect(outcome).toEqual({ status: "skipped", reason: "no CRM connected" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
