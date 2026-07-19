"use client";

import * as React from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { upsertScoringRule, deleteScoringRule } from "@/lib/actions/leads";
import type { ActionState } from "@/lib/actions/business";
import { SUGGESTED_SIGNALS } from "@/lib/lead-scoring";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Rule = typeof schema.leadScoringRules.$inferSelect;

export function ScoringRulesManager({ rules }: { rules: Rule[] }) {
  const [formKey, setFormKey] = React.useState(0);
  const [upsertState, upsertAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await upsertScoringRule(prev, fd);
      if (result.success) setFormKey((k) => k + 1);
      return result;
    },
    {},
  );
  const [rowState, deleteAction] = useActionState<ActionState, FormData>(deleteScoringRule, {});

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Scores start from your questions&apos; score impacts, then these signals add or subtract
        points. Leads land at hot (75+), warm (40+), or cold.
      </p>
      <form key={formKey} action={upsertAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <input type="hidden" name="id" value="" />
        <div>
          <Label htmlFor="rule-name">Rule name</Label>
          <Input id="rule-name" name="name" required className="mt-1 w-56" placeholder="e.g. Urgent need" />
        </div>
        <div>
          <Label htmlFor="rule-signal">Signal</Label>
          <Select id="rule-signal" name="signal" className="mt-1 w-64">
            {SUGGESTED_SIGNALS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rule-points">Points</Label>
          <Input id="rule-points" name="points" type="number" min={-100} max={100} defaultValue={10}
            className="mt-1 w-24" />
        </div>
        <SubmitButton>Add rule</SubmitButton>
        <FormMessage state={upsertState} />
      </form>

      <FormMessage state={rowState} />
      {rules.length === 0 ? (
        <p className="text-sm text-ink-500">
          No custom scoring rules yet — question score impacts still apply.
        </p>
      ) : (
        <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-900">{r.name}</span>
                <Badge variant="outline">{r.signal.replaceAll("_", " ")}</Badge>
                <Badge variant={r.points >= 0 ? "success" : "danger"}>
                  {r.points >= 0 ? "+" : ""}{r.points} pts
                </Badge>
              </div>
              <form
                action={deleteAction}
                onSubmit={(e) => {
                  if (!confirm(`Delete rule "${r.name}"?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${r.name}`}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
