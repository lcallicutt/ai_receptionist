import { PLAN_DEFINITIONS, formatPrice, type PlanTier } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Plans" };

const ORDER: PlanTier[] = ["basic", "growth", "premium"];

export default function AdminPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Plans</h1>
        <p className="text-sm text-ink-500">
          Plan definitions and limits — enforced server-side on every request. Editable plan
          management arrives with billing in Phase 9.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {ORDER.map((tier) => {
          const plan = PLAN_DEFINITIONS[tier];
          return (
            <Card key={tier}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {formatPrice(plan.monthlyPriceCents)}/month{plan.usageBased ? " + usage" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Limits</h3>
                  <dl className="mt-2 space-y-1">
                    {Object.entries(plan.limits).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-ink-500">{key.replaceAll("_", " ")}</dt>
                        <dd className="font-medium text-ink-900">{value === null ? "Unlimited" : value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Features</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {plan.features.map((f) => (
                      <Badge key={f} variant="neutral">
                        {f.replaceAll("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
