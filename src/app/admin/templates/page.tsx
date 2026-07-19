import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const db = await getDb();
  const templates = await db
    .select()
    .from(schema.industryTemplates)
    .orderBy(asc(schema.industryTemplates.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Industry Templates</h1>
        <p className="text-sm text-ink-500">
          Starter configuration applied to new accounts by vertical — greeting, call goals,
          qualification fields, appointment types, disclaimers, and follow-ups.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {templates.map((t) => {
          const tpl = t.template as Record<string, unknown>;
          const goals = Array.isArray(tpl.callGoals) ? (tpl.callGoals as string[]) : [];
          const disclaimers = Array.isArray(tpl.disclaimers) ? (tpl.disclaimers as string[]) : [];
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t.name}</CardTitle>
                  <Badge variant={t.isActive ? "success" : "neutral"}>
                    {t.isActive ? "active" : "inactive"}
                  </Badge>
                </div>
                <CardDescription>{t.industry.replaceAll("_", " ")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {typeof tpl.greeting === "string" ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Greeting</p>
                    <p className="text-ink-700">{tpl.greeting}</p>
                  </div>
                ) : null}
                {goals.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Call goals</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {goals.map((g) => (
                        <Badge key={g} variant="brand">{g.replaceAll("_", " ")}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {disclaimers.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Disclaimers</p>
                    <ul className="mt-1 list-disc pl-5 text-ink-700">
                      {disclaimers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <details className="text-xs text-ink-500">
                  <summary className="cursor-pointer">Full template JSON</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs">
                    {JSON.stringify(tpl, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
