"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible toggle rendered as a styled checkbox. Works inside plain forms
 * (submits "on" when checked) and with controlled state.
 */
export const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <span className={cn("relative inline-flex h-6 w-11 shrink-0", className)}>
    <input
      ref={ref}
      type="checkbox"
      className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      {...props}
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-full bg-ink-300/50 transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
    />
  </span>
));
Switch.displayName = "Switch";
