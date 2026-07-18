"use client";

import { useActionState } from "react";
import { assignCall, toggleCallUnread } from "@/lib/actions/calls";
import { addLeadNote } from "@/lib/actions/leads";
import type { ActionState } from "@/lib/actions/business";
import { Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

interface MemberOption {
  userId: string;
  name: string;
}

export function CallControls({
  callId,
  leadId,
  assignedUserId,
  isUnread,
  members,
}: {
  callId: string;
  leadId: string | null;
  assignedUserId: string | null;
  isUnread: boolean;
  members: MemberOption[];
}) {
  const [assignState, assignAction] = useActionState<ActionState, FormData>(assignCall, {});
  const [, unreadAction] = useActionState<ActionState, FormData>(toggleCallUnread, {});
  const [noteState, noteAction] = useActionState<ActionState, FormData>(addLeadNote, {});

  return (
    <div className="space-y-5">
      <form action={assignAction} className="space-y-2">
        <Label htmlFor="call-assign">Assigned team member</Label>
        <input type="hidden" name="callId" value={callId} />
        <div className="flex gap-2">
          <Select id="call-assign" name="userId" defaultValue={assignedUserId ?? ""}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline" size="md">Save</Button>
        </div>
        <FormMessage state={assignState} />
      </form>

      <form action={unreadAction}>
        <input type="hidden" name="callId" value={callId} />
        <Button type="submit" variant="ghost" size="sm">
          Mark as {isUnread ? "read" : "unread"}
        </Button>
      </form>

      {leadId ? (
        <form action={noteAction} className="space-y-2">
          <Label htmlFor="call-note">Add internal note</Label>
          <input type="hidden" name="leadId" value={leadId} />
          <Textarea id="call-note" name="body" rows={3} placeholder="Visible to your team only" />
          <div className="flex items-center gap-3">
            <SubmitButton size="sm">Add note</SubmitButton>
            <FormMessage state={noteState} />
          </div>
        </form>
      ) : null}
    </div>
  );
}
