import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatDuration, formatPhone } from "@/lib/utils";

export const metadata = { title: "Calls" };

export default async function AdminCallsPage() {
  const db = await getDb();
  const calls = await db
    .select({ call: schema.callRecords, org: schema.organizations })
    .from(schema.callRecords)
    .innerJoin(schema.organizations, eq(schema.callRecords.organizationId, schema.organizations.id))
    .orderBy(desc(schema.callRecords.startedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Calls</h1>
        <p className="text-sm text-ink-500">Platform-wide call activity (most recent 100)</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                  <th scope="col" className="px-6 py-3 font-medium">Organization</th>
                  <th scope="col" className="px-6 py-3 font-medium">From</th>
                  <th scope="col" className="px-6 py-3 font-medium">When</th>
                  <th scope="col" className="px-6 py-3 font-medium">Duration</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Outcome</th>
                  <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(({ call, org }) => (
                  <tr key={call.id} className="border-b border-ink-300/10 last:border-0">
                    <td className="px-6 py-3 font-medium text-ink-900">{org.name}</td>
                    <td className="px-6 py-3 text-ink-500">{formatPhone(call.fromNumber)}</td>
                    <td className="px-6 py-3 text-ink-500">
                      {call.startedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-3 text-ink-500">{formatDuration(call.durationSeconds)}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      {call.outcome ? (
                        <Badge variant={statusVariant(call.outcome)}>{call.outcome.replaceAll("_", " ")}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-ink-500">{call.provider ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
