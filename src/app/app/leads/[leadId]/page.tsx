import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { LeadControls } from "@/components/features/lead-controls";
import { ResyncCrmButton } from "@/components/features/resync-crm-button";
import { formatDuration, formatPhone } from "@/lib/utils";

export const metadata = { title: "Lead Detail" };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const ctx = await requireOrgContext();
  const { leadId } = await params;
  const db = await getDb();
  const orgId = ctx.organization.id;

  const leads = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.id, leadId), eq(schema.leads.organizationId, orgId)))
    .limit(1);
  const lead = leads[0];
  if (!lead) notFound();

  const [answers, notes, tags, calls, appointments, smsRows, members] = await Promise.all([
    db.select().from(schema.leadAnswers).where(eq(schema.leadAnswers.leadId, lead.id)),
    db
      .select({ note: schema.leadNotes, author: schema.users })
      .from(schema.leadNotes)
      .leftJoin(schema.users, eq(schema.leadNotes.authorUserId, schema.users.id))
      .where(eq(schema.leadNotes.leadId, lead.id))
      .orderBy(desc(schema.leadNotes.createdAt)),
    db.select().from(schema.leadTags).where(eq(schema.leadTags.leadId, lead.id)),
    db
      .select()
      .from(schema.callRecords)
      .where(eq(schema.callRecords.leadId, lead.id))
      .orderBy(desc(schema.callRecords.startedAt)),
    db.select().from(schema.appointments).where(eq(schema.appointments.leadId, lead.id)),
    lead.callerId
      ? db.select().from(schema.smsMessages).where(eq(schema.smsMessages.callerId, lead.callerId))
      : Promise.resolve([]),
    db
      .select({ userId: schema.users.id, name: schema.users.name })
      .from(schema.organizationMembers)
      .innerJoin(schema.users, eq(schema.organizationMembers.userId, schema.users.id))
      .where(eq(schema.organizationMembers.organizationId, orgId)),
  ]);

  const followUpLocal = lead.followUpAt
    ? new Date(lead.followUpAt.getTime() - lead.followUpAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/leads" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to leads
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {lead.name || "Unknown caller"}
          </h1>
          <Badge variant={statusVariant(lead.classification)}>{lead.classification}</Badge>
          <Badge variant={statusVariant(lead.status)}>{lead.status.replaceAll("_", " ")}</Badge>
          <span className="text-sm text-ink-500">Score: {lead.score}/100</span>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {[lead.phone ? formatPhone(lead.phone) : null, lead.email, lead.company]
            .filter(Boolean)
            .join(" · ") || "No contact details"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Call reason</dt>
                  <dd className="text-sm text-ink-900">{lead.callReason ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Requested service</dt>
                  <dd className="text-sm text-ink-900">{lead.requestedService ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Source</dt>
                  <dd className="text-sm text-ink-900">{lead.source?.replaceAll("_", " ") ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">CRM sync</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(lead.crmSyncStatus)}>{lead.crmSyncStatus}</Badge>
                    <ResyncCrmButton leadId={lead.id} />
                    {lead.crmSyncError ? (
                      <span className="text-xs text-red-700">{lead.crmSyncError}</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {answers.length > 0 ? (
                <div className="mt-4 border-t border-ink-300/15 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-300">
                    Qualification answers
                  </p>
                  <dl className="space-y-2">
                    {answers.map((a) => (
                      <div key={a.id}>
                        <dt className="text-xs text-ink-500">{a.questionPrompt}</dt>
                        <dd className="text-sm text-ink-900">{a.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calls</CardTitle>
              <CardDescription>{calls.length} related call{calls.length === 1 ? "" : "s"}</CardDescription>
            </CardHeader>
            <CardContent>
              {calls.length === 0 ? (
                <p className="text-sm text-ink-500">No calls linked to this lead.</p>
              ) : (
                <ul className="divide-y divide-ink-300/15">
                  {calls.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2.5">
                      <Link href={`/app/calls/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {c.startedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </Link>
                      <span className="flex items-center gap-2 text-sm text-ink-500">
                        {formatDuration(c.durationSeconds)}
                        {c.outcome ? (
                          <Badge variant={statusVariant(c.outcome)}>{c.outcome.replaceAll("_", " ")}</Badge>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {appointments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-ink-300/15">
                  {appointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-ink-900">{a.service ?? "Appointment"}</span>
                      <span className="flex items-center gap-2 text-ink-500">
                        {a.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {smsRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Text messages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {smsRows.map((sms) => (
                    <li key={sms.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-500">
                          {sms.direction === "outbound" ? "Sent" : "Received"}
                        </span>
                        <Badge variant={statusVariant(sms.status)}>{sms.status}</Badge>
                      </div>
                      <p className="mt-1 text-ink-700">{sms.body}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-ink-500">No notes yet — add one from the panel.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map(({ note, author }) => (
                    <li key={note.id} className="rounded-lg bg-surface-muted p-3">
                      <p className="text-sm text-ink-700">{note.body}</p>
                      <p className="mt-1 text-xs text-ink-300">
                        {author?.name ?? "Unknown"} ·{" "}
                        {note.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Manage lead</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadControls
                leadId={lead.id}
                status={lead.status}
                classification={lead.classification}
                assignedUserId={lead.assignedUserId}
                followUpAt={followUpLocal}
                tags={tags.map((t) => ({ id: t.id, tag: t.tag }))}
                members={members}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
