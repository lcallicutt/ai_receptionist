"use server";

import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { eq } from "drizzle-orm";

const demoRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(30),
  industry: z.enum([
    "realtor",
    "home_services",
    "med_spa",
    "salon",
    "law_office",
    "church",
    "other",
  ]),
});

export type DemoRequestResult = { ok: true } | { ok: false; error: string };

/**
 * Stores an inbound demo request as a lead on FlowNet's own platform
 * organization so it appears in the admin portal like any other lead.
 */
export async function submitDemoRequest(input: unknown): Promise<DemoRequestResult> {
  const parsed = demoRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  try {
    const db = await getDb();
    const platformOrg = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, "flownet-platform"))
      .limit(1);
    const orgId = platformOrg[0]?.id;
    if (!orgId) {
      // Platform org not seeded yet — accept gracefully rather than losing the prospect.
      console.warn("demo-request: platform organization missing; lead not stored");
      return { ok: true };
    }

    await db.insert(schema.leads).values({
      id: newId("lead"),
      organizationId: orgId,
      name: parsed.data.name,
      company: parsed.data.businessName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      callReason: `Demo request (${parsed.data.industry})`,
      source: "website_demo_request",
      status: "new",
      classification: "warm",
    });
    return { ok: true };
  } catch (err) {
    console.error("demo-request: failed to store lead", err);
    return { ok: false, error: "Something went wrong. Please try again or email us." };
  }
}
