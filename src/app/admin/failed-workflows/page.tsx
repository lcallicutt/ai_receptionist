import { desc, eq, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResyncCrmButton } from "@/components/features/resync-crm-button";
import { formatPhone } from "@/lib/utils";

export const metadata = { title: "Failed Workflows" };

export default async function FailedWorkflowsPage() {
  const db = await getDb();

  const [failedSyncs, failedWebhooks, failedIntegrations] = await Promise.all([
    db
      .select({ lead: schema.leads, org: schema.organizations })
      .from(schema.leads)
      .innerJoin(schema.organizations, eq(schema.leads.organizationId, schema.organizations.id))
      .where(eq(schema.leads.crmSyncStatus, "failed"))
      .orderBy(desc(schema.leads.updatedAt))
      .limit(50),
    db
      .select({ event: schema.webhookEvents, org: schema.organizations })
      .from(schema.webhookEvents)
      .leftJoin(schema.organizations, eq(schema.webhookEvents.organizationId, schema.organizations.id))
      .where(eq(schema.webhookEvents.status, "failed"))
      .orderBy(desc(schema.webhookEvents.receivedAt))
      .limit(50),
    db
      .select({ log: schema.integrationLogs, org: schema.organizations })
      .from(schema.integrationLogs)
      .leftJoin(schema.organizations, eq(schema.integrationLogs.organizationId, schema.organizations.id))
      .where(and(eq(schema.integrationLogs.success, false)))
      .orderBy(desc(schema.integrationLogs.createdAt))
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Failed Workflows</h1>
        <p className="text-sm text-ink-500">
          Failed CRM syncs, webhook deliveries, and integration operations across all tenants
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Failed CRM syncs</CardTitle>
          <CardDescription>
            {failedSyncs.length} lead{failedSyncs.length === 1 ? "" : "s"} awaiting a successful
            sync — retry runs the full sync again with the tenant&apos;s connected CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {failedSyncs.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">No failed CRM syncs. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Lead</th>
                    <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                    <th scope="col" className="px-6 py-3 font-medium">Error</th>
                    <th scope="col" className="px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {failedSyncs.map(({ lead, org }) => (
                    <tr key={lead.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3">
                        <span className="font-medium text-ink-900">{lead.name ?? "Unknown"}</span>
                        <span className="block text-xs text-ink-500">
                          {lead.phone ? formatPhone(lead.phone) : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-ink-500">{org.name}</td>
                      <td className="max-w-[20rem] truncate px-6 py-3 text-xs text-red-700">
                        {lead.crmSyncError ?? "—"}
                      </td>
                      <td className="px-6 py-3">
                        <ResyncCrmButton leadId={lead.id} organizationId={lead.organizationId} admin />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failed webhook events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {failedWebhooks.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">No failed webhook deliveries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Received</th>
                    <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                    <th scope="col" className="px-6 py-3 font-medium">Event</th>
                    <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                    <th scope="col" className="px-6 py-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {failedWebhooks.map(({ event, org }) => (
                    <tr key={event.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3 text-ink-500">
                        {event.receivedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 font-medium text-ink-900">{event.provider}</td>
                      <td className="px-6 py-3 text-ink-500">{event.eventKind}</td>
                      <td className="px-6 py-3 text-ink-500">{org?.name ?? "—"}</td>
                      <td className="max-w-[20rem] truncate px-6 py-3 text-xs text-red-700">
                        {event.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failed integration operations</CardTitle>
          <CardDescription>Most recent 50 across calendar, CRM, voice, and automation</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {failedIntegrations.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">No failed integration operations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">When</th>
                    <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                    <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                    <th scope="col" className="px-6 py-3 font-medium">Operation</th>
                    <th scope="col" className="px-6 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {failedIntegrations.map(({ log, org }) => (
                    <tr key={log.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3 text-ink-500">
                        {log.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 text-ink-500">{org?.name ?? "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant="neutral">{log.provider}</Badge>
                      </td>
                      <td className="px-6 py-3 text-ink-500">{log.operation}</td>
                      <td className="max-w-[20rem] truncate px-6 py-3 text-xs text-red-700">
                        {log.detail ? JSON.stringify(log.detail) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
