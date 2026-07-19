import { count } from "drizzle-orm";
import { readdirSync } from "fs";
import path from "path";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "System Settings" };

export default async function SystemPage() {
  const db = await getDb();
  const [orgs, users, webhookEvents, auditLogs] = await Promise.all([
    db.select({ n: count() }).from(schema.organizations),
    db.select({ n: count() }).from(schema.users),
    db.select({ n: count() }).from(schema.webhookEvents),
    db.select({ n: count() }).from(schema.auditLogs),
  ]);

  let migrations: string[] = [];
  try {
    migrations = readdirSync(path.join(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql"));
  } catch {
    migrations = [];
  }

  const rows: Array<[string, string]> = [
    ["Database driver", process.env.DATABASE_URL ? "Postgres (DATABASE_URL)" : "Embedded PGlite (dev fallback)"],
    ["Applied migrations", `${migrations.length} (${migrations.join(", ")})`],
    ["Node environment", process.env.NODE_ENV ?? "development"],
    ["AUTH_SECRET", process.env.AUTH_SECRET ? "set" : "dev fallback (set before production)"],
    ["CREDENTIALS_SECRET", process.env.CREDENTIALS_SECRET ? "set" : "falls back to AUTH_SECRET"],
    ["Organizations", String(orgs[0]?.n ?? 0)],
    ["Users", String(users[0]?.n ?? 0)],
    ["Webhook events", String(webhookEvents[0]?.n ?? 0)],
    ["Audit log entries", String(auditLogs[0]?.n ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">System Settings</h1>
        <p className="text-sm text-ink-500">Deployment configuration and platform totals</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Deployment</CardTitle>
          <CardDescription>
            Provider credential status lives on the Provider Health page; plan and overage
            configuration lives in src/lib/plans.ts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-ink-300/15">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-ink-500">{label}</dt>
                <dd className="max-w-[60%] truncate text-right font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Production checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {[
              ["DATABASE_URL (Neon Postgres)", Boolean(process.env.DATABASE_URL)],
              ["AUTH_SECRET", Boolean(process.env.AUTH_SECRET)],
              ["Twilio credentials", Boolean(process.env.TWILIO_ACCOUNT_SID)],
              ["Retell credentials", Boolean(process.env.RETELL_API_KEY)],
              ["Google OAuth credentials", Boolean(process.env.GOOGLE_CLIENT_ID)],
              ["Stripe (Phase 9+)", Boolean(process.env.STRIPE_SECRET_KEY)],
            ].map(([label, ok]) => (
              <li key={String(label)} className="flex items-center justify-between">
                <span className="text-ink-700">{label}</span>
                <Badge variant={ok ? "success" : "outline"}>{ok ? "configured" : "pending"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
