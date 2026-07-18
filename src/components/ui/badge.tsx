import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-ink-700",
        brand: "bg-brand-100 text-brand-800",
        success: "bg-emerald-100 text-emerald-800",
        warning: "bg-amber-100 text-amber-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-sky-100 text-sky-800",
        outline: "border border-ink-300/50 text-ink-500",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Maps common status strings to badge variants for consistent status display. */
export function statusVariant(status: string): BadgeProps["variant"] {
  const map: Record<string, BadgeProps["variant"]> = {
    active: "success",
    connected: "success",
    synced: "success",
    completed: "success",
    confirmed: "success",
    won: "success",
    hot: "danger",
    warm: "warning",
    cold: "info",
    pending: "warning",
    retrying: "warning",
    trialing: "info",
    scheduled: "info",
    new: "brand",
    qualified: "brand",
    draft: "neutral",
    paused: "neutral",
    failed: "danger",
    missed: "danger",
    suspended: "danger",
    disqualified: "neutral",
    lost: "neutral",
    cancelled: "neutral",
  };
  return map[status] ?? "neutral";
}
