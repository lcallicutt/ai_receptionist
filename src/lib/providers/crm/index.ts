import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { decryptCredentials } from "@/lib/crypto";
import type { CRMProvider } from "./types";
import { GoHighLevelProvider } from "./gohighlevel";
import { WebhookCrmProvider } from "./webhook";

export type { CRMProvider, CrmLeadPayload } from "./types";

/**
 * Resolves the connected CRM provider for a tenant, or null when no CRM is
 * connected. Tenant credentials are stored encrypted on crm_connections;
 * GHL_API_KEY serves as a platform-level fallback for agency-managed
 * GoHighLevel accounts.
 */
export async function getCrmProvider(organizationId: string): Promise<CRMProvider | null> {
  const db = await getDb();
  const connections = await db
    .select()
    .from(schema.crmConnections)
    .where(
      and(
        eq(schema.crmConnections.organizationId, organizationId),
        eq(schema.crmConnections.status, "connected"),
      ),
    )
    .limit(1);
  const connection = connections[0];
  if (!connection) return null;

  if (connection.provider === "gohighlevel") {
    let apiKey = process.env.GHL_API_KEY ?? null;
    if (connection.encryptedCredentials) {
      try {
        apiKey = decryptCredentials<{ apiKey: string }>(connection.encryptedCredentials).apiKey;
      } catch {
        return null;
      }
    }
    if (!apiKey) return null;
    return new GoHighLevelProvider(apiKey);
  }

  if (connection.provider === "webhook" && connection.webhookUrl) {
    let secret: string | null = null;
    if (connection.encryptedCredentials) {
      try {
        secret = decryptCredentials<{ secret: string }>(connection.encryptedCredentials).secret;
      } catch {
        return null;
      }
    }
    return new WebhookCrmProvider(connection.webhookUrl, secret);
  }

  return null;
}
