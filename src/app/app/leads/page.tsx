import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Users } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatPhone, cn } from "@/lib/utils";

export const metadata = { title: "Leads" };

const STATUS_FILTERS = [
  ["all", "All"],
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["appointment_booked", "Booked"],
  ["follow_up_required", "Follow-up"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["disqualified", "Disqualified"],
] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const { status = "all", q = "" } = await searchParams;

  const conditions: SQL[] = [eq(schema.leads.organizationId, ctx.organization.id)];
  if (status !== "all" && (schema.leadStatusEnum.enumValues as readonly string[]).includes(status)) {
    conditions.push(eq(schema.leads.status, status as (typeof schema.leadStatusEnum.enumValues)[number]));
  }
  if (q.trim()) {
    const term = `%${q.trim()}%`;
    const search = or(
      ilike(schema.leads.name, term),
      ilike(schema.leads.phone, term),
      ilike(schema.leads.email, term),
      ilike(schema.leads.requestedService, term),
    );
    if (search) conditions.push(search);
  }

  const leads = await db
    .select({ lead: schema.leads, assignee: schema.users })
    .from(schema.leads)
    .leftJoin(schema.users, eq(schema.leads.assignedUserId, schema.users.id))
    .where(and(...conditions))
    .orderBy(desc(schema.leads.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Leads</h1>
        <p className="text-sm text-ink-500">Everyone your receptionist has captured</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter leads by status" className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/app/leads" : `/app/leads?status=${value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                status === value
                  ? "border-brand-600 bg-brand-100 text-brand-800"
                  : "border-ink-300/40 text-ink-500 hover:border-brand-300",
              )}
              aria-current={status === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form method="get" action="/app/leads" className="flex gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="lead-search" className="sr-only">Search leads</label>
          <Input id="lead-search" name="q" defaultValue={q} placeholder="Search name, phone, service…" className="w-64" />
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No leads match"
                description="Leads are created automatically when your receptionist captures caller details."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-300/20 text-xs uppercase tracking-wide text-ink-300">
                    <th scope="col" className="px-6 py-3 font-medium">Lead</th>
                    <th scope="col" className="px-6 py-3 font-medium">Service</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Score</th>
                    <th scope="col" className="px-6 py-3 font-medium">Assigned</th>
                    <th scope="col" className="px-6 py-3 font-medium">CRM</th>
                    <th scope="col" className="px-6 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(({ lead, assignee }) => (
                    <tr key={lead.id} className="border-b border-ink-300/10 last:border-0 hover:bg-surface-muted/60">
                      <td className="px-6 py-3">
                        <Link href={`/app/leads/${lead.id}`} className="block">
                          <span className="font-medium text-ink-900">{lead.name || "Unknown caller"}</span>
                          <span className="block text-xs text-ink-500">
                            {lead.phone ? formatPhone(lead.phone) : lead.email ?? "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-ink-500">{lead.requestedService ?? lead.callReason ?? "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(lead.status)}>{lead.status.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant={statusVariant(lead.classification)}>{lead.classification}</Badge>
                          <span className="text-xs text-ink-500">{lead.score}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3 text-ink-500">{assignee?.name ?? "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(lead.crmSyncStatus)}>{lead.crmSyncStatus}</Badge>
                      </td>
                      <td className="px-6 py-3 text-ink-500">
                        {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
