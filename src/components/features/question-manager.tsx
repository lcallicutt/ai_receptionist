"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { upsertQuestion, deleteQuestion, moveQuestion } from "@/lib/actions/qualification";
import type { ActionState } from "@/lib/actions/business";
import { QUESTION_TYPE_OPTIONS } from "@/lib/receptionist-options";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Question = typeof schema.qualificationQuestions.$inferSelect;

const TYPE_LABELS = new Map<string, string>(QUESTION_TYPE_OPTIONS.map(([v, l]) => [v, l]));

export function QuestionManager({ questions }: { questions: Question[] }) {
  const [editing, setEditing] = React.useState<Question | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [upsertState, upsertAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await upsertQuestion(prev, fd);
      if (result.success) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    {},
  );
  const [rowState, deleteAction] = useActionState<ActionState, FormData>(deleteQuestion, {});
  const [, moveAction] = useActionState<ActionState, FormData>(moveQuestion, {});

  return (
    <div className="space-y-6">
      <form key={formKey} action={upsertAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">
          {editing ? "Edit question" : "Add a qualification question"}
        </h3>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <div>
          <Label htmlFor="q-prompt">Question prompt</Label>
          <Input id="q-prompt" name="prompt" required className="mt-1"
            defaultValue={editing?.prompt ?? ""}
            placeholder="e.g. What service do you need?" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="q-type">Answer type</Label>
            <Select id="q-type" name="questionType" className="mt-1"
              defaultValue={editing?.questionType ?? "short_text"}>
              {QUESTION_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="q-score">Lead score impact (-100 to 100)</Label>
            <Input id="q-score" name="leadScoreImpact" type="number" min={-100} max={100}
              className="mt-1" defaultValue={editing?.leadScoreImpact ?? 0} />
          </div>
          <div>
            <Label htmlFor="q-disqualify">Disqualifying answer (optional)</Label>
            <Input id="q-disqualify" name="disqualifyingAnswer" className="mt-1"
              defaultValue={editing?.disqualifyingAnswer ?? ""}
              placeholder="e.g. Outside service area" />
          </div>
        </div>
        <div>
          <Label htmlFor="q-notes">Internal notes</Label>
          <Textarea id="q-notes" name="internalNotes" rows={2} className="mt-1"
            defaultValue={editing?.internalNotes ?? ""} />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="required" defaultChecked={editing?.required ?? false}
              className="h-4 w-4 accent-brand-700" />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="saveToCrm" defaultChecked={editing?.saveToCrm ?? true}
              className="h-4 w-4 accent-brand-700" />
            Save answer to CRM
          </label>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>{editing ? "Save changes" : "Add question"}</SubmitButton>
          {editing ? (
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setFormKey((k) => k + 1); }}>
              Cancel
            </Button>
          ) : null}
          <FormMessage state={upsertState} />
        </div>
      </form>

      <FormMessage state={rowState} />
      {questions.length === 0 ? (
        <p className="text-sm text-ink-500">No qualification questions yet.</p>
      ) : (
        <ol className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {questions.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">
                  {i + 1}. {q.prompt}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="neutral">{TYPE_LABELS.get(q.questionType) ?? q.questionType}</Badge>
                  {q.required ? <Badge variant="brand">required</Badge> : null}
                  {q.leadScoreImpact !== 0 ? (
                    <Badge variant={q.leadScoreImpact > 0 ? "success" : "danger"}>
                      {q.leadScoreImpact > 0 ? "+" : ""}{q.leadScoreImpact} pts
                    </Badge>
                  ) : null}
                  {q.disqualifyingAnswer ? <Badge variant="warning">disqualifier</Badge> : null}
                  {q.saveToCrm ? <Badge variant="outline">→ CRM</Badge> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <form action={moveAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === 0}
                    aria-label={`Move question ${i + 1} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </form>
                <form action={moveAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === questions.length - 1}
                    aria-label={`Move question ${i + 1} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </form>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(q); setFormKey((k) => k + 1); }}
                  aria-label={`Edit question ${i + 1}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <form
                  action={deleteAction}
                  onSubmit={(e) => {
                    if (!confirm("Delete this question?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={q.id} />
                  <Button type="submit" variant="ghost" size="sm"
                    aria-label={`Delete question ${i + 1}`}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
