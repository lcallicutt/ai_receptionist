import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Mic } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CallControls } from "@/components/features/call-controls";
import { formatDuration, formatPhone, cn } from "@/lib/utils";

export const metadata = { title: "Call Detail" };

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const ctx = await requireOrgContext();
  const { callId } = await params;
  const db = await getDb();
  const orgId = ctx.organization.id;

  const calls = await db
    .select()
    .from(schema.callRecords)
    .where(and(eq(schema.callRecords.id, callId), eq(schema.callRecords.organizationId, orgId)))
    .limit(1);
  const call = calls[0];
  if (!call) notFound();

  // Opening the detail page marks the call read.
  const wasUnread = call.isUnread;
  if (wasUnread) {
    await db.update(schema.callRecords).set({ isUnread: false }).where(eq(schema.callRecords.id, call.id));
  }

  const [callerRows, transcripts, summaries, events, leadRows, recordings, smsRows, memberRows] =
    await Promise.all([
      call.callerId
        ? db.select().from(schema.callers).where(eq(schema.callers.id, call.callerId)).limit(1)
        : Promise.resolve([]),
      db.select().from(schema.callTranscripts).where(eq(schema.callTranscripts.callRecordId, call.id)).limit(1),
      db.select().from(schema.callSummaries).where(eq(schema.callSummaries.callRecordId, call.id)).limit(1),
      db.select().from(schema.callEvents).where(eq(schema.callEvents.callRecordId, call.id)).orderBy(asc(schema.callEvents.occurredAt)),
      call.leadId
        ? db.select().from(schema.leads).where(eq(schema.leads.id, call.leadId)).limit(1)
        : Promise.resolve([]),
      db.select().from(schema.callRecordings).where(eq(schema.callRecordings.callRecordId, call.id)).limit(1),
      db.select().from(schema.smsMessages).where(eq(schema.smsMessages.relatedCallId, call.id)),
      db
        .select({ userId: schema.users.id, name: schema.users.name })
        .from(schema.organizationMembers)
        .innerJoin(schema.users, eq(schema.organizationMembers.userId, schema.users.id))
        .where(eq(schema.organizationMembers.organizationId, orgId)),
    ]);

  const caller = callerRows[0];
  const transcript = transcripts[0];
  const summary = summaries[0];
  const lead = leadRows[0];
  const recording = recordings[0];

  const answers = lead
    ? await db.select().from(schema.leadAnswers).where(eq(schema.leadAnswers.leadId, lead.id))
    : [];
  const appointments = lead
    ? await db.select().from(schema.appointments).where(eq(schema.appointments.leadId, lead.id))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/calls" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to call inbox
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {caller?.name || formatPhone(call.fromNumber)}
          </h1>
          {call.outcome ? (
            <Badge variant={statusVariant(call.outcome)}>{call.outcome.replaceAll("_", " ")}</Badge>
          ) : null}
          <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
          {call.provider === "simulator" ? <Badge variant="warning">simulated</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {formatPhone(call.fromNumber)} → {formatPhone(call.toNumber)} ·{" "}
          {call.startedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
          {formatDuration(call.durationSeconds)}
          {call.sentiment ? ` · ${call.sentiment} sentiment` : ""}
          {call.urgency ? ` · ${call.urgency} urgency` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {summary ? (
            <Card>
              <CardHeader>
                <CardTitle>Call summary</CardTitle>
                {summary.reasonForCalling ? (
                  <CardDescription>Reason: {summary.reasonForCalling}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.detailedSummary ? (
                  <p className="rounded-lg bg-surface-muted p-4 text-sm text-ink-700">
                    {summary.detailedSummary}
                  </p>
                ) : null}
                {summary.smsSummary ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">SMS summary</p>
                    <p className="mt-1 text-sm text-ink-700">{summary.smsSummary}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recording & transcript</CardTitle>
              <CardDescription>
                {recording
                  ? "Recording available"
                  : "No recording — recording is off by default and configurable under Compliance."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recording ? (
                <p className="mb-4 flex items-center gap-2 text-sm text-ink-500">
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Secure playback with time-limited URLs arrives with the voice integration (Phase 5).
                </p>
              ) : null}
              {transcript && transcript.segments.length > 0 ? (
                <ol className="space-y-3" aria-label="Call transcript">
                  {transcript.segments.map((seg, i) => (
                    <li key={i}
                      className={cn(
                        "max-w-[85%] rounded-lg p-3 text-sm",
                        seg.role === "assistant"
                          ? "bg-brand-50 text-brand-900"
                          : "ml-auto bg-surface-muted text-ink-700",
                      )}>
                      <span className="block text-xs font-semibold text-ink-300">
                        {seg.role === "assistant" ? "Receptionist" : "Caller"}
                      </span>
                      {seg.text}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-500">No transcript for this call.</p>
              )}
            </CardContent>
          </Card>

          {lead ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lead</CardTitle>
                    <CardDescription>Captured from this call</CardDescription>
                  </div>
                  <Link href={`/app/leads/${lead.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    Open lead
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(lead.classification)}>{lead.classification}</Badge>
                  <Badge variant={statusVariant(lead.status)}>{lead.status.replaceAll("_", " ")}</Badge>
                  <span className="text-sm text-ink-500">Score: {lead.score}/100</span>
                  <Badge variant={statusVariant(lead.crmSyncStatus)}>CRM: {lead.crmSyncStatus}</Badge>
                </div>
                {answers.length > 0 ? (
                  <dl className="space-y-2">
                    {answers.map((a) => (
                      <div key={a.id}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">{a.questionPrompt}</dt>
                        <dd className="text-sm text-ink-900">{a.answer}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {appointments.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Appointment</p>
                    {appointments.map((a) => (
                      <p key={a.id} className="mt-1 text-sm text-ink-900">
                        {a.service} —{" "}
                        {a.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}{" "}
                        <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      </p>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {smsRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>SMS messages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {smsRows.map((sms) => (
                    <li key={sms.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-500">
                          {sms.direction === "outbound" ? "Sent" : "Received"}
                          {sms.isTextBack ? " · missed-call text-back" : ""}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <CallControls
                callId={call.id}
                leadId={call.leadId}
                assignedUserId={call.assignedUserId}
                isUnread={false}
                members={memberRows}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>System events for this call</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 border-l-2 border-brand-200 pl-4">
                {events.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium text-ink-900">{e.eventType.replaceAll("_", " ")}</p>
                    <p className="text-xs text-ink-300">
                      {e.occurredAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provider details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Provider</dt>
                  <dd className="text-ink-900">{call.provider ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Provider call ID</dt>
                  <dd className="break-all font-mono text-xs text-ink-700">{call.providerCallId ?? "—"}</dd>
                </div>
                {call.errorDetail ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-300">Error</dt>
                    <dd className="text-red-700">{call.errorDetail}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
