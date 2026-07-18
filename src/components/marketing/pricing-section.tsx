import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_DEFINITIONS, formatPrice, type PlanTier } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORDER: PlanTier[] = ["basic", "growth", "premium"];

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ORDER.map((tier) => {
        const plan = PLAN_DEFINITIONS[tier];
        const featured = tier === "growth";
        const highlights = compact ? plan.highlights.slice(0, 6) : plan.highlights;
        return (
          <Card
            key={tier}
            className={cn("flex flex-col", featured && "border-brand-500 shadow-lg ring-1 ring-brand-500")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {featured ? <Badge variant="brand">Most popular</Badge> : null}
              </div>
              <CardDescription>{plan.tagline}</CardDescription>
              <p className="mt-3">
                <span className="text-4xl font-bold text-ink-900">
                  {formatPrice(plan.monthlyPriceCents)}
                </span>
                <span className="text-sm text-ink-500">
                  /month{plan.usageBased ? " + usage" : ""}
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="flex-1 space-y-2.5">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
              <Link
                href="/book-a-demo"
                className={cn(
                  buttonVariants({ variant: featured ? "primary" : "secondary" }),
                  "mt-6 w-full",
                )}
              >
                Get started with {plan.name}
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
