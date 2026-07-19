import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Server-rendered chart primitives following the dataviz method:
 * single-hue magnitude marks (identity lives in row labels, not color),
 * thin marks with rounded data ends, 2px surface gaps, text in ink tokens,
 * native tooltips on marks, and a table view for every chart.
 */

const BAR_COLOR = "#1c6568"; // brand-700 — ≥3:1 on the light surface (validated)

export interface BarDatum {
  label: string;
  value: number;
  /** Optional secondary note shown in the table view. */
  note?: string;
}

/** Horizontal bar list — magnitude by labeled category. */
export function HBarChart({
  title,
  data,
  valueSuffix = "",
  className,
}: {
  title: string;
  data: BarDatum[];
  valueSuffix?: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="space-y-2" role="img" aria-label={`${title} bar chart`}>
        {data.map((d) => (
          <div key={d.label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-2">
            <span className="truncate text-sm text-ink-700" title={d.label}>
              {d.label}
            </span>
            <div className="h-4 rounded-full bg-surface-muted">
              <div
                className="h-4 rounded-full"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: BAR_COLOR, minWidth: d.value > 0 ? "4px" : 0 }}
                title={`${d.label}: ${d.value}${valueSuffix}`}
              />
            </div>
            <span className="text-right text-sm font-medium tabular-nums text-ink-900">
              {d.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
      <ChartTable title={title} data={data} valueSuffix={valueSuffix} />
    </figure>
  );
}

/** Vertical daily bars — magnitude over discrete time. */
export function ColumnChart({
  title,
  data,
  className,
}: {
  title: string;
  data: BarDatum[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="sr-only">{title}</figcaption>
      <div
        className="flex h-36 items-end gap-[2px]"
        role="img"
        aria-label={`${title} column chart`}
      >
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: BAR_COLOR,
                minHeight: d.value > 0 ? "3px" : "1px",
                opacity: d.value > 0 ? 1 : 0.15,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-300">
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>
      <ChartTable title={title} data={data} />
    </figure>
  );
}

/** Accessible data table view for every chart. */
function ChartTable({
  title,
  data,
  valueSuffix = "",
}: {
  title: string;
  data: BarDatum[];
  valueSuffix?: string;
}) {
  return (
    <details className="text-xs text-ink-500">
      <summary className="cursor-pointer">View as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-b border-ink-300/20">
            <th scope="col" className="py-1 pr-4 font-medium">Label</th>
            <th scope="col" className="py-1 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-ink-300/10 last:border-0">
              <td className="py-1 pr-4">{d.label}{d.note ? ` — ${d.note}` : ""}</td>
              <td className="py-1 tabular-nums">{d.value}{valueSuffix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Allowance meter — usage against an included allowance. */
export function UsageMeter({
  label,
  used,
  allowance,
  unit,
}: {
  label: string;
  used: number;
  allowance: number | null;
  unit: string;
}) {
  const pct = allowance === null ? 0 : Math.min(100, (used / Math.max(1, allowance)) * 100);
  const over = allowance !== null && used > allowance;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        <span className="tabular-nums text-ink-500">
          {used.toLocaleString()} / {allowance === null ? "∞" : allowance.toLocaleString()} {unit}
        </span>
      </div>
      <div
        className="mt-1 h-3 rounded-full bg-surface-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={allowance ?? undefined}
        aria-valuenow={used}
        aria-label={`${label}: ${used} of ${allowance ?? "unlimited"} ${unit}`}
      >
        <div
          className="h-3 rounded-full"
          style={{
            width: allowance === null ? "4px" : `${pct}%`,
            backgroundColor: over ? "#b45309" : "#1c6568",
            minWidth: used > 0 ? "4px" : 0,
          }}
        />
      </div>
      {over ? (
        <p className="mt-1 text-xs font-medium text-amber-700">
          {(used - (allowance ?? 0)).toLocaleString()} {unit} over the included allowance
        </p>
      ) : null}
    </div>
  );
}
