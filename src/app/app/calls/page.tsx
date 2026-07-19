import Link from "next/link";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { PhoneIncoming } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatPhone, cn } from "@/lib/utils";

export const metadata = { title: "Call Inbox" };

const OUTCOME_FILTERS = [
  ["all", "All calls"],
  ["appointment_booked", "Booked"],
  ["lead_captured", "Leads"],
  ["faq_resolved", "FAQ resolved"],
  ["call_transferred", "Transferred"],
  ["follow_up_required", "Follow-up"],
  ["missed", "Missed"],
  ["spam", "Spam"],
] as const;

export default async function CallInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const { outcome = "all" } = await searchParams;

  const conditions: SQL[] = [eq(schema.callRecords.organizationId, ctx.organization.id)];
  if (outcome === "missed") {
    conditions.push(eq(schema.callRecords.status, "missed"));
  } else if (outcome !== "all" && (schema.callOutcomeEnum.enumValues as readonly string[]).includes(outcome)) {
    conditions.push(eq(schema.callRecords.outcome, outcome as (typeof schema.callOutcomeEnum.enumValues)[number]));
  }

  const calls = await db
    .select({
      call: schema.callRecords,
      caller: schema.callers,
      lead: schema.leads,
    })
    .from(schema.callRecords)
    .leftJoin(schema.callers, eq(schema.callRecords.callerId, schema.callers.id))
    .leftJoin(schema.leads, eq(schema.callRecords.leadId, schema.leads.id))
    .where(and(...conditions))
    .orderBy(desc(schema.callRecords.startedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Call Inbox</h1>
        <p className="text-sm text-ink-500">Every call your receptionist has handled</p>
      </div>

      <nav aria-label="Filter calls by outcome" className="flex flex-wrap gap-2">
        {OUTCOME_FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={value === "all" ? "/app/calls" : `/app/calls?outcome=${value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              outcome === value
                ? "border-brand-600 bg-brand-100 text-brand-800"
                : "border-ink-300/40 text-ink-500 hover:border-brand-300",
            )}
            aria-current={outcome === value ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={PhoneIncoming}
                title="No calls match this filter"
                description="Calls appear here as your receptionist handles them. Use the Test Receptionist page to simulate one."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Caller</th>
                    <th scope="col" className="px-6 py-3 font-medium">When</th>
                    <th scope="col" className="px-6 py-3 font-medium">Duration</th>
                    <th scope="col" className="px-6 py-3 font-medium">Outcome</th>
                    <th scope="col" className="px-6 py-3 font-medium">Lead</th>
                    <th scope="col" className="px-6 py-3 font-medium">Urgency</th>
                    <th scope="col" className="px-6 py-3 font-medium">CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map(({ call, caller, lead }) => (
                    <tr key={call.id}
                      className={cn("border-b border-ink-300/10 last:border-0 hover:bg-surface-muted/60", call.isUnread && "bg-brand-50/40")}>
                      <td className="px-6 py-3">
                        <Link href={`/app/calls/${call.id}`} className="block">
                          <span className={cn("text-ink-900", call.isUnread && "font-semibold")}>
                            {caller?.name || formatPhone(call.fromNumber)}
                          </span>
                          <span className="block text-xs text-ink-500">{formatPhone(call.fromNumber)}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-ink-500">
                        {call.startedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3 text-ink-500">{formatDuration(call.durationSeconds)}</td>
                      <td className="px-6 py-3">
                        {call.outcome ? (
                          <Badge variant={statusVariant(call.outcome)}>{call.outcome.replaceAll("_", " ")}</Badge>
                        ) : (
                          <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {lead ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge variant={statusVariant(lead.classification)}>{lead.classification}</Badge>
                            <span className="text-xs text-ink-500">{lead.score}</span>
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-ink-500">{call.urgency ?? "—"}</td>
                      <td className="px-6 py-3">
                        {lead ? (
                          <Badge variant={statusVariant(lead.crmSyncStatus)}>{lead.crmSyncStatus}</Badge>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
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
