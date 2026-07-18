"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { upsertFaq, deleteFaq, toggleFaq, moveFaq } from "@/lib/actions/faqs";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Faq = typeof schema.faqs.$inferSelect;

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const [editing, setEditing] = React.useState<Faq | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [upsertState, upsertAction] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await upsertFaq(prev, fd);
      if (result.success) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    {},
  );
  const [rowState, deleteAction] = useActionState<ActionState, FormData>(deleteFaq, {});
  const [, toggleAction] = useActionState<ActionState, FormData>(toggleFaq, {});
  const [, moveAction] = useActionState<ActionState, FormData>(moveFaq, {});

  return (
    <div className="space-y-6">
      <form key={formKey} action={upsertAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">
          {editing ? "Edit FAQ" : "Add an FAQ"}
        </h3>
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <div>
          <Label htmlFor="faq-question">Question</Label>
          <Input id="faq-question" name="question" required className="mt-1"
            defaultValue={editing?.question ?? ""} />
        </div>
        <div>
          <Label htmlFor="faq-answer">Approved answer</Label>
          <Textarea id="faq-answer" name="answer" rows={3} required className="mt-1"
            defaultValue={editing?.answer ?? ""} />
          <p className="mt-1 text-xs text-ink-300">
            The receptionist only answers from approved content — it never improvises.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="faq-category">Category</Label>
            <Input id="faq-category" name="category" className="mt-1"
              defaultValue={editing?.category ?? ""} placeholder="e.g. Pricing" />
          </div>
          <div>
            <Label htmlFor="faq-keywords">Keywords (comma-separated)</Label>
            <Input id="faq-keywords" name="keywords" className="mt-1"
              defaultValue={(editing?.keywords ?? []).join(", ")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="escalateIfUnanswered"
            defaultChecked={editing?.escalateIfUnanswered ?? false}
            className="h-4 w-4 accent-brand-700" />
          Escalate to a human if the caller isn&apos;t satisfied with this answer
        </label>
        <div className="flex items-center gap-3">
          <SubmitButton>{editing ? "Save changes" : "Add FAQ"}</SubmitButton>
          {editing ? (
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setFormKey((k) => k + 1); }}>
              Cancel
            </Button>
          ) : null}
          <FormMessage state={upsertState} />
        </div>
      </form>

      <FormMessage state={rowState} />
      {faqs.length === 0 ? (
        <p className="text-sm text-ink-500">No FAQs yet — add your first one above.</p>
      ) : (
        <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
          {faqs.map((faq, i) => (
            <li key={faq.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{faq.question}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{faq.answer}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {faq.category ? <Badge variant="neutral">{faq.category}</Badge> : null}
                  <Badge variant={faq.isActive ? "success" : "outline"}>
                    {faq.isActive ? "active" : "inactive"}
                  </Badge>
                  {faq.escalateIfUnanswered ? <Badge variant="warning">escalates</Badge> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <form action={moveAction}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === 0}
                    aria-label={`Move "${faq.question}" up`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </form>
                <form action={moveAction}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" size="sm" disabled={i === faqs.length - 1}
                    aria-label={`Move "${faq.question}" down`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </form>
                <form action={toggleAction}>
                  <input type="hidden" name="id" value={faq.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {faq.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(faq); setFormKey((k) => k + 1); }}
                  aria-label={`Edit "${faq.question}"`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <form
                  action={deleteAction}
                  onSubmit={(e) => {
                    if (!confirm("Delete this FAQ? This can't be undone.")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={faq.id} />
                  <Button type="submit" variant="ghost" size="sm"
                    aria-label={`Delete "${faq.question}"`}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
