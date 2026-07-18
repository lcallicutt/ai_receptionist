"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import {
  updateLeadStatus,
  updateLeadClassification,
  assignLead,
  addLeadNote,
  addLeadTag,
  removeLeadTag,
  setLeadFollowUp,
} from "@/lib/actions/leads";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "follow_up_required",
  "won",
  "lost",
  "disqualified",
];
const CLASSIFICATIONS = ["hot", "warm", "cold", "disqualified", "existing_customer", "vendor", "spam"];

export function LeadControls({
  leadId,
  status,
  classification,
  assignedUserId,
  followUpAt,
  tags,
  members,
}: {
  leadId: string;
  status: string;
  classification: string;
  assignedUserId: string | null;
  followUpAt: string | null;
  tags: Array<{ id: string; tag: string }>;
  members: Array<{ userId: string; name: string }>;
}) {
  const [statusState, statusAction] = useActionState<ActionState, FormData>(updateLeadStatus, {});
  const [classState, classAction] = useActionState<ActionState, FormData>(updateLeadClassification, {});
  const [assignState, assignAction] = useActionState<ActionState, FormData>(assignLead, {});
  const [noteState, noteAction] = useActionState<ActionState, FormData>(addLeadNote, {});
  const [tagState, tagAction] = useActionState<ActionState, FormData>(addLeadTag, {});
  const [, removeTagAction] = useActionState<ActionState, FormData>(removeLeadTag, {});
  const [followState, followAction] = useActionState<ActionState, FormData>(setLeadFollowUp, {});

  return (
    <div className="space-y-5">
      <form action={statusAction} className="space-y-1.5">
        <Label htmlFor="lead-status">Status</Label>
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex gap-2">
          <Select id="lead-status" name="status" defaultValue={status}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Save</Button>
        </div>
        <FormMessage state={statusState} />
      </form>

      <form action={classAction} className="space-y-1.5">
        <Label htmlFor="lead-class">Classification</Label>
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex gap-2">
          <Select id="lead-class" name="classification" defaultValue={classification}>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Save</Button>
        </div>
        <FormMessage state={classState} />
      </form>

      <form action={assignAction} className="space-y-1.5">
        <Label htmlFor="lead-assign">Assigned to</Label>
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex gap-2">
          <Select id="lead-assign" name="userId" defaultValue={assignedUserId ?? ""}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Save</Button>
        </div>
        <FormMessage state={assignState} />
      </form>

      <form action={followAction} className="space-y-1.5">
        <Label htmlFor="lead-followup">Follow-up</Label>
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex gap-2">
          <Input id="lead-followup" name="followUpAt" type="datetime-local" defaultValue={followUpAt ?? ""} />
          <Button type="submit" variant="outline">Set</Button>
        </div>
        <FormMessage state={followState} />
      </form>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink-700">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t.id} className="inline-flex items-center">
              <Badge variant="neutral" className="gap-1 pr-1">
                {t.tag}
                <form action={removeTagAction} className="inline-flex">
                  <input type="hidden" name="tagId" value={t.id} />
                  <button type="submit" aria-label={`Remove tag ${t.tag}`} className="rounded-full p-0.5 hover:bg-ink-300/30">
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </Badge>
            </span>
          ))}
          {tags.length === 0 ? <span className="text-xs text-ink-300">No tags</span> : null}
        </div>
        <form action={tagAction} className="flex gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <label htmlFor="lead-tag" className="sr-only">Add tag</label>
          <Input id="lead-tag" name="tag" placeholder="Add a tag" className="h-9" />
          <Button type="submit" variant="outline" size="sm" className="h-9">Add</Button>
        </form>
        <FormMessage state={tagState} />
      </div>

      <form action={noteAction} className="space-y-1.5">
        <Label htmlFor="lead-note">Add note</Label>
        <input type="hidden" name="leadId" value={leadId} />
        <Textarea id="lead-note" name="body" rows={3} />
        <div className="flex items-center gap-3">
          <SubmitButton size="sm">Add note</SubmitButton>
          <FormMessage state={noteState} />
        </div>
      </form>
    </div>
  );
}
