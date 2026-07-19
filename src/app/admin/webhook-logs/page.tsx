import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Webhook Logs" };

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  processed: "success",
  processing: "warning",
  received: "info",
  failed: "danger",
  duplicate: "neutral",
  invalid_signature: "danger",
};

export default async function WebhookLogsPage() {
  const db = await getDb();
  const events = await db
    .select({ event: schema.webhookEvents, org: schema.organizations })
    .from(schema.webhookEvents)
    .leftJoin(schema.organizations, eq(schema.webhookEvents.organizationId, schema.organizations.id))
    .orderBy(desc(schema.webhookEvents.receivedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Webhook Logs</h1>
        <p className="text-sm text-ink-500">
          Provider webhook deliveries with signature and idempotency state (most recent 100).
          Replay tooling arrives with the retry manager in Phase 6.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Duplicates are acknowledged without reprocessing; invalid signatures are rejected and
            logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">No webhook events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Received</th>
                    <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                    <th scope="col" className="px-6 py-3 font-medium">Event</th>
                    <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                    <th scope="col" className="px-6 py-3 font-medium">Signature</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(({ event, org }) => (
                    <tr key={event.id} className="border-b border-ink-300/10 last:border-0">
                      <td className="px-6 py-3 text-ink-500">
                        {event.receivedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 font-medium text-ink-900">{event.provider}</td>
                      <td className="px-6 py-3 text-ink-500">{event.eventKind}</td>
                      <td className="px-6 py-3 text-ink-500">{org?.name ?? "—"}</td>
                      <td className="px-6 py-3">
                        {event.signatureValid === null ? (
                          <span className="text-ink-300">—</span>
                        ) : (
                          <Badge variant={event.signatureValid ? "success" : "danger"}>
                            {event.signatureValid ? "valid" : "invalid"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_BADGE[event.status] ?? "neutral"}>
                          {event.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="max-w-[16rem] truncate px-6 py-3 text-xs text-red-700">
                        {event.error ?? ""}
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
