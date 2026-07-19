import { desc, eq, count, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Provider Health" };

export default async function ProviderHealthPage() {
  const db = await getDb();

  const deploymentProviders = [
    { name: "Twilio (telephony + SMS)", configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) },
    { name: "Retell (voice AI)", configured: Boolean(process.env.RETELL_API_KEY) },
    { name: "Google Calendar", configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
    { name: "Email (transactional)", configured: Boolean(process.env.RESEND_API_KEY) },
    { name: "n8n automation", configured: Boolean(process.env.N8N_WEBHOOK_URL) },
    { name: "Sample webhook", configured: Boolean(process.env.SAMPLE_WEBHOOK_SECRET) },
  ];

  const [connectionCounts, recentLogs, failedWebhooks] = await Promise.all([
    db
      .select({
        providerType: schema.providerConnections.providerType,
        provider: schema.providerConnections.provider,
        n: count(),
      })
      .from(schema.providerConnections)
      .where(eq(schema.providerConnections.status, "connected"))
      .groupBy(schema.providerConnections.providerType, schema.providerConnections.provider),
    db
      .select({ log: schema.integrationLogs, org: schema.organizations })
      .from(schema.integrationLogs)
      .leftJoin(schema.organizations, eq(schema.integrationLogs.organizationId, schema.organizations.id))
      .orderBy(desc(schema.integrationLogs.createdAt))
      .limit(25),
    db
      .select({ n: count() })
      .from(schema.webhookEvents)
      .where(and(eq(schema.webhookEvents.status, "failed"))),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Provider Health</h1>
        <p className="text-sm text-ink-500">
          Deployment configuration, tenant connections, and recent integration activity
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployment configuration</CardTitle>
            <CardDescription>Platform-level provider credentials (environment)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {deploymentProviders.map((p) => (
                <li key={p.name} className="flex items-center justify-between rounded-lg border border-ink-300/20 px-4 py-2.5">
                  <span className="text-sm font-medium text-ink-900">{p.name}</span>
                  <Badge variant={p.configured ? "success" : "outline"}>
                    {p.configured ? "configured" : "not configured"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant connections</CardTitle>
            <CardDescription>
              Connected per-organization providers · {failedWebhooks[0]?.n ?? 0} failed webhook
              event{(failedWebhooks[0]?.n ?? 0) === 1 ? "" : "s"} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionCounts.length === 0 ? (
              <p className="text-sm text-ink-500">No tenant provider connections yet.</p>
            ) : (
              <ul className="space-y-2">
                {connectionCounts.map((c) => (
                  <li key={`${c.providerType}-${c.provider}`} className="flex items-center justify-between rounded-lg border border-ink-300/20 px-4 py-2.5 text-sm">
                    <span className="font-medium text-ink-900">
                      {c.provider} <span className="text-ink-500">({c.providerType.replaceAll("_", " ")})</span>
                    </span>
                    <span className="text-ink-500">{c.n} connected</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent integration activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">No integration activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">When</th>
                    <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                    <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                    <th scope="col" className="px-6 py-3 font-medium">Operation</th>
                    <th scope="col" className="px-6 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map(({ log, org }) => (
                    <tr key={log.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3 text-ink-500">
                        {log.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 text-ink-500">{org?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-ink-900">{log.provider}</td>
                      <td className="px-6 py-3 text-ink-500">{log.operation}</td>
                      <td className="px-6 py-3">
                        <Badge variant={log.success ? "success" : "danger"}>
                          {log.success ? "success" : "failed"}
                        </Badge>
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
