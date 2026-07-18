/**
 * Tenant-isolation tests against a real (in-memory PGlite) Postgres database:
 * queries scoped by organizationId must never return another tenant's rows,
 * and org-scoped membership lookups must deny cross-tenant access.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";

process.env.PGLITE_DATA_DIR = "memory://tenant-isolation";
delete process.env.DATABASE_URL;

import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";

let db: Awaited<ReturnType<typeof getDb>>;
const orgA = newId("org");
const orgB = newId("org");
const userA = newId("user");

beforeAll(async () => {
  db = await getDb();

  await db.insert(schema.organizations).values([
    { id: orgA, name: "Tenant A", slug: `tenant-a-${orgA}`, industry: "realtor" },
    { id: orgB, name: "Tenant B", slug: `tenant-b-${orgB}`, industry: "law_office" },
  ]);
  await db.insert(schema.users).values({ id: userA, email: `${userA}@example.com`, name: "User A" });
  await db.insert(schema.organizationMembers).values({
    id: newId("mem"),
    organizationId: orgA,
    userId: userA,
    role: "owner",
  });

  const mkCall = (orgId: string) => ({
    id: newId("call"),
    organizationId: orgId,
    direction: "inbound" as const,
    status: "completed" as const,
    fromNumber: "+15550001111",
    toNumber: "+15550002222",
    startedAt: new Date(),
    durationSeconds: 60,
  });
  await db.insert(schema.callRecords).values([mkCall(orgA), mkCall(orgA), mkCall(orgB)]);

  await db.insert(schema.leads).values([
    { id: newId("lead"), organizationId: orgA, name: "Lead A" },
    { id: newId("lead"), organizationId: orgB, name: "Lead B" },
  ]);
});

describe("tenant isolation", () => {
  it("org-scoped call queries never return another tenant's calls", async () => {
    const callsA = await db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.organizationId, orgA));
    expect(callsA).toHaveLength(2);
    expect(callsA.every((c) => c.organizationId === orgA)).toBe(true);
  });

  it("org-scoped lead queries never leak across tenants", async () => {
    const leadsB = await db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.organizationId, orgB));
    expect(leadsB).toHaveLength(1);
    expect(leadsB[0]?.name).toBe("Lead B");
  });

  it("membership check denies a user access to an org they don't belong to", async () => {
    const membership = await db
      .select()
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.userId, userA),
          eq(schema.organizationMembers.organizationId, orgB),
        ),
      );
    expect(membership).toHaveLength(0);
  });

  it("membership check allows a user access to their own org with their role", async () => {
    const membership = await db
      .select()
      .from(schema.organizationMembers)
      .where(
        and(
          eq(schema.organizationMembers.userId, userA),
          eq(schema.organizationMembers.organizationId, orgA),
        ),
      );
    expect(membership).toHaveLength(1);
    expect(membership[0]?.role).toBe("owner");
  });
});
