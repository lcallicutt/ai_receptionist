import { desc, eq } from "drizzle-orm";
import { MessageSquareText } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPhone, cn } from "@/lib/utils";

export const metadata = { title: "SMS Activity" };

export default async function SmsActivityPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();

  const messages = await db
    .select({ sms: schema.smsMessages, caller: schema.callers })
    .from(schema.smsMessages)
    .leftJoin(schema.callers, eq(schema.smsMessages.callerId, schema.callers.id))
    .where(eq(schema.smsMessages.organizationId, ctx.organization.id))
    .orderBy(desc(schema.smsMessages.createdAt))
    .limit(100);

  const textBacks = messages.filter((m) => m.sms.isTextBack).length;
  const inbound = messages.filter((m) => m.sms.direction === "inbound").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">SMS Activity</h1>
        <p className="text-sm text-ink-500">
          Missed-call text-backs, confirmations, and caller replies · {textBacks} text-back
          {textBacks === 1 ? "" : "s"}, {inbound} repl{inbound === 1 ? "y" : "ies"} in the last
          100 messages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Queued messages send automatically once the SMS provider is configured. Opted-out
            callers never receive automated texts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="No SMS activity yet"
              description="Text-backs are sent automatically when calls are missed. Simulate a missed call from the Test Receptionist page to see the flow."
            />
          ) : (
            <ul className="space-y-3">
              {messages.map(({ sms, caller }) => (
                <li
                  key={sms.id}
                  className={cn(
                    "max-w-[90%] rounded-lg border p-3 text-sm",
                    sms.direction === "outbound"
                      ? "border-brand-200 bg-brand-50"
                      : "ml-auto border-ink-300/25 bg-surface-muted",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink-500">
                      {sms.direction === "outbound" ? "To" : "From"}{" "}
                      {caller?.name ?? formatPhone(sms.direction === "outbound" ? sms.toNumber : sms.fromNumber)}
                      {sms.isTextBack ? " · missed-call text-back" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      {caller?.smsOptedOut ? <Badge variant="danger">opted out</Badge> : null}
                      <Badge variant={statusVariant(sms.status)}>{sms.status}</Badge>
                      <span className="text-xs text-ink-300">
                        {sms.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-ink-700">{sms.body}</p>
                  {sms.error ? <p className="mt-1 text-xs text-red-700">{sms.error}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
