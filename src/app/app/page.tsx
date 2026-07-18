import Link from "next/link";
import { count, eq, and, desc } from "drizzle-orm";
import {
  PhoneIncoming,
  PhoneMissed,
  Users,
  CalendarCheck2,
  Bot,
} from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatPhone } from "@/lib/utils";

export default async function ClientDashboardPage() {
  const ctx = await requireOrgContext();
  const orgId = ctx.organization.id;
  const db = await getDb();

  const [
    totalCalls,
    missedCalls,
    totalLeads,
    qualifiedLeads,
    totalAppointments,
    receptionists,
    recentCalls,
  ] = await Promise.all([
    db.select({ n: count() }).from(schema.callRecords).where(eq(schema.callRecords.organizationId, orgId)),
    db
      .select({ n: count() })
      .from(schema.callRecords)
      .where(and(eq(schema.callRecords.organizationId, orgId), eq(schema.callRecords.status, "missed"))),
    db.select({ n: count() }).from(schema.leads).where(eq(schema.leads.organizationId, orgId)),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, orgId), eq(schema.leads.status, "qualified"))),
    db.select({ n: count() }).from(schema.appointments).where(eq(schema.appointments.organizationId, orgId)),
    db
      .select()
      .from(schema.aiReceptionists)
      .where(eq(schema.aiReceptionists.organizationId, orgId)),
    db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.organizationId, orgId))
      .orderBy(desc(schema.callRecords.startedAt))
      .limit(6),
  ]);

  const receptionist = receptionists[0];
  const metrics = [
    { label: "Total calls", value: totalCalls[0]?.n ?? 0, icon: PhoneIncoming },
    { label: "Missed calls", value: missedCalls[0]?.n ?? 0, icon: PhoneMissed },
    { label: "Leads captured", value: totalLeads[0]?.n ?? 0, icon: Users },
    { label: "Qualified leads", value: qualifiedLeads[0]?.n ?? 0, icon: Users },
    { label: "Appointments", value: totalAppointments[0]?.n ?? 0, icon: CalendarCheck2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Welcome back, {ctx.user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-500">{ctx.organization.name}</p>
        </div>
        {receptionist ? (
          <Badge variant={statusVariant(receptionist.status)}>
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            {receptionist.name} — {receptionist.status}
          </Badge>
        ) : null}
      </div>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <m.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold text-ink-900">{m.value}</p>
                <p className="text-xs text-ink-500">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Recent calls">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent calls</CardTitle>
                <CardDescription>The latest activity on your line</CardDescription>
              </div>
              <Link href="/app/calls" className="text-sm font-medium text-brand-700 hover:underline">
                View call inbox
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <EmptyState
                icon={PhoneIncoming}
                title="No calls yet"
                description="Once your receptionist is live, every call will appear here with its outcome, summary, and lead details."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                      <th scope="col" className="py-2 pr-4 font-medium">Caller</th>
                      <th scope="col" className="py-2 pr-4 font-medium">When</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Duration</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Outcome</th>
                      <th scope="col" className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCalls.map((call) => (
                      <tr key={call.id} className="border-b border-ink-300/10 last:border-0">
                        <td className="py-3 pr-4 font-medium text-ink-900">
                          {formatPhone(call.fromNumber)}
                        </td>
                        <td className="py-3 pr-4 text-ink-500">
                          {call.startedAt.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 text-ink-500">{formatDuration(call.durationSeconds)}</td>
                        <td className="py-3 pr-4">
                          {call.outcome ? (
                            <Badge variant={statusVariant(call.outcome)}>
                              {call.outcome.replaceAll("_", " ")}
                            </Badge>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
