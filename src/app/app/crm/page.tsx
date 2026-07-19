import { count, eq, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { isAutomationConfigured } from "@/lib/providers/automation/n8n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrmConnectionsPanel } from "@/components/features/crm-connections-panel";

export const metadata = { title: "CRM Connections" };

export default async function CrmPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;

  const [connections, syncedCount, failedCount, pendingCount] = await Promise.all([
    db.select().from(schema.crmConnections).where(eq(schema.crmConnections.organizationId, orgId)).limit(1),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, orgId), eq(schema.leads.crmSyncStatus, "synced"))),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, orgId), eq(schema.leads.crmSyncStatus, "failed"))),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, orgId), eq(schema.leads.crmSyncStatus, "pending"))),
  ]);
  const connection = connections[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">CRM Connections</h1>
        <p className="text-sm text-ink-500">
          Every captured lead syncs automatically — contacts, notes, tags, scores, and
          appointments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Synced leads", syncedCount[0]?.n ?? 0, "success"],
          ["Pending sync", pendingCount[0]?.n ?? 0, "warning"],
          ["Failed syncs", failedCount[0]?.n ?? 0, "danger"],
        ].map(([label, value, variant]) => (
          <Card key={String(label)}>
            <CardContent className="flex items-center justify-between p-5">
              <span className="text-sm text-ink-500">{label}</span>
              <Badge variant={variant as "success" | "warning" | "danger"}>{value}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your CRM</CardTitle>
          <CardDescription>
            One CRM connection per account — failed syncs retry from the lead page or
            automatically on the next call from the same caller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrmConnectionsPanel
            connection={
              connection
                ? {
                    id: connection.id,
                    provider: connection.provider,
                    label: connection.label,
                    webhookUrl: connection.webhookUrl,
                    status: connection.status,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>n8n automation</CardTitle>
          <CardDescription>
            Platform events (calls completed, leads created, appointments booked) stream to your
            n8n instance for custom workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">
              Configured at the deployment level via N8N_WEBHOOK_URL, with signed deliveries when
              N8N_WEBHOOK_SECRET is set.
            </p>
            <Badge variant={isAutomationConfigured() ? "success" : "outline"}>
              {isAutomationConfigured() ? "active" : "not configured"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
