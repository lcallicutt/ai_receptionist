import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { PLAN_DEFINITIONS, formatPrice, type PlanTier } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Check } from "lucide-react";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();

  const subs = await db
    .select({ sub: schema.subscriptions, plan: schema.plans })
    .from(schema.subscriptions)
    .innerJoin(schema.plans, eq(schema.subscriptions.planId, schema.plans.id))
    .where(eq(schema.subscriptions.organizationId, ctx.organization.id))
    .limit(1);
  const current = subs[0];
  const tier = (current?.plan.tier ?? "basic") as PlanTier;
  const plan = PLAN_DEFINITIONS[tier];
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Billing</h1>
        <p className="text-sm text-ink-500">Your plan and billing status</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                {plan.name} — {formatPrice(plan.monthlyPriceCents)}/month
                {plan.usageBased ? " + usage" : ""}
              </CardTitle>
              <CardDescription>{plan.tagline}</CardDescription>
            </div>
            {current ? (
              <Badge variant={statusVariant(current.sub.status)}>{current.sub.status}</Badge>
            ) : (
              <Badge variant="warning">no subscription</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {plan.highlights.slice(0, 8).map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>
          {current?.sub.currentPeriodEnd ? (
            <p className="mt-4 text-sm text-ink-500">
              Current period ends{" "}
              {current.sub.currentPeriodEnd.toLocaleDateString("en-US", { dateStyle: "long" })}
              {current.sub.manualBilling ? " · billed manually by FlowNet" : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments & invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {stripeConfigured ? (
            <p className="text-sm text-ink-500">
              Stripe is configured — self-serve checkout, upgrades, and invoices are being
              finalized. Contact FlowNet for immediate plan changes.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              Card payments and self-serve plan changes arrive with the Stripe integration. Until
              then, billing is handled directly by FlowNet Automation — contact
              hello@flownetautomation.com to change plans, and your account status above always
              reflects the current agreement.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
