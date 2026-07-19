import Link from "next/link";
import { and, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HBarChart, ColumnChart, type BarDatum } from "@/components/ui/charts";
import { formatDuration, cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

const RANGES = [
  ["7", "7 days"],
  ["14", "14 days"],
  ["30", "30 days"],
  ["90", "90 days"],
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function rangeWindow(days: number): { since: Date; dayLabels: string[] } {
  const now = Date.now();
  const dayLabels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayLabels.push(
      new Date(now - i * DAY_MS).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
  }
  return { since: new Date(now - days * DAY_MS), dayLabels };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;
  const { range = "14" } = await searchParams;
  const days = ["7", "14", "30", "90"].includes(range) ? Number(range) : 14;
  const { since, dayLabels } = rangeWindow(days);

  const [calls, leads, smsRows] = await Promise.all([
    db
      .select({
        startedAt: schema.callRecords.startedAt,
        status: schema.callRecords.status,
        outcome: schema.callRecords.outcome,
        durationSeconds: schema.callRecords.durationSeconds,
      })
      .from(schema.callRecords)
      .where(and(eq(schema.callRecords.organizationId, orgId), gte(schema.callRecords.startedAt, since))),
    db
      .select({
        status: schema.leads.status,
        classification: schema.leads.classification,
        crmSyncStatus: schema.leads.crmSyncStatus,
        createdAt: schema.leads.createdAt,
      })
      .from(schema.leads)
      .where(and(eq(schema.leads.organizationId, orgId), gte(schema.leads.createdAt, since))),
    db
      .select({ isTextBack: schema.smsMessages.isTextBack, direction: schema.smsMessages.direction })
      .from(schema.smsMessages)
      .where(and(eq(schema.smsMessages.organizationId, orgId), gte(schema.smsMessages.createdAt, since))),
  ]);

  // Headline metrics
  const totalCalls = calls.length;
  const answered = calls.filter((c) => c.status === "completed").length;
  const missed = calls.filter((c) => c.status === "missed" || c.status === "abandoned").length;
  const faqResolved = calls.filter((c) => c.outcome === "faq_resolved").length;
  const transferred = calls.filter((c) => c.outcome === "call_transferred").length;
  const booked = calls.filter((c) => c.outcome === "appointment_booked").length;
  const qualified = leads.filter((l) => ["qualified", "appointment_booked", "won"].includes(l.status)).length;
  const won = leads.filter((l) => l.status === "won").length;
  const avgDuration =
    answered > 0
      ? Math.round(
          calls.filter((c) => c.status === "completed").reduce((s, c) => s + (c.durationSeconds ?? 0), 0) / answered,
        )
      : 0;
  const textBacks = smsRows.filter((s) => s.isTextBack).length;
  const replies = smsRows.filter((s) => s.direction === "inbound").length;
  const crmSynced = leads.filter((l) => l.crmSyncStatus === "synced").length;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  const tiles: Array<[string, string]> = [
    ["Total calls", String(totalCalls)],
    ["Calls answered", String(answered)],
    ["Missed calls", String(missed)],
    ["Leads captured", String(leads.length)],
    ["Qualified leads", String(qualified)],
    ["Appointments booked", String(booked)],
    ["Calls transferred", String(transferred)],
    ["FAQ resolution rate", `${pct(faqResolved, totalCalls)}%`],
    ["Booking conversion", `${pct(booked, leads.length)}%`],
    ["Lead conversion", `${pct(won, leads.length)}%`],
    ["Avg call duration", formatDuration(avgDuration)],
    ["Text-back messages", String(textBacks)],
    ["CRM sync success", `${pct(crmSynced, leads.length)}%`],
    ["Est. opportunities recovered", String(Math.min(replies, missed))],
  ];

  // Calls over time (daily buckets)
  const dayBuckets = new Map<string, number>(dayLabels.map((label) => [label, 0]));
  for (const c of calls) {
    const key = c.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const callsOverTime: BarDatum[] = [...dayBuckets].map(([label, value]) => ({ label, value }));

  // Outcomes
  const outcomeCounts = new Map<string, number>();
  for (const c of calls) {
    const key = (c.outcome ?? c.status).replaceAll("_", " ");
    outcomeCounts.set(key, (outcomeCounts.get(key) ?? 0) + 1);
  }
  const outcomes: BarDatum[] = [...outcomeCounts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Lead quality
  const classCounts = new Map<string, number>();
  for (const l of leads) {
    const key = l.classification.replaceAll("_", " ");
    classCounts.set(key, (classCounts.get(key) ?? 0) + 1);
  }
  const leadQuality: BarDatum[] = [...classCounts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const funnel: BarDatum[] = [
    { label: "Calls", value: totalCalls },
    { label: "Leads captured", value: leads.length },
    { label: "Qualified", value: qualified },
    { label: "Appointments", value: booked },
    { label: "Won", value: won },
  ];

  const recovery: BarDatum[] = [
    { label: "Missed calls", value: missed },
    { label: "Text-backs sent", value: textBacks },
    { label: "Caller replies", value: replies },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-500">Performance over the selected period</p>
        </div>
        <nav aria-label="Date range" className="flex gap-2">
          {RANGES.map(([value, label]) => (
            <Link
              key={value}
              href={`/app/analytics?range=${value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                String(days) === value
                  ? "border-brand-600 bg-brand-100 text-brand-800"
                  : "border-ink-300/40 text-ink-500 hover:border-brand-300",
              )}
              aria-current={String(days) === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xl font-bold tabular-nums text-ink-900">{value}</p>
              <p className="text-xs text-ink-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calls over time</CardTitle>
            <CardDescription>Daily call volume, last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart title="Calls over time" data={callsOverTime} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call outcomes</CardTitle>
            <CardDescription>How calls resolved</CardDescription>
          </CardHeader>
          <CardContent>
            {outcomes.length === 0 ? (
              <p className="text-sm text-ink-500">No calls in this period.</p>
            ) : (
              <HBarChart title="Call outcomes" data={outcomes} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
            <CardDescription>Calls → leads → qualified → booked → won</CardDescription>
          </CardHeader>
          <CardContent>
            <HBarChart title="Conversion funnel" data={funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead quality</CardTitle>
            <CardDescription>Classification of captured leads</CardDescription>
          </CardHeader>
          <CardContent>
            {leadQuality.length === 0 ? (
              <p className="text-sm text-ink-500">No leads in this period.</p>
            ) : (
              <HBarChart title="Lead quality" data={leadQuality} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Missed-call recovery</CardTitle>
            <CardDescription>
              Missed calls, automatic text-backs, and caller replies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HBarChart title="Missed-call recovery" data={recovery} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
