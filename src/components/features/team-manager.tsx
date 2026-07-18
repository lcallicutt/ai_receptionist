"use client";

import * as React from "react";
import { useActionState } from "react";
import { inviteMember, changeMemberRole, removeMember, type TeamActionState } from "@/lib/actions/team";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

export interface TeamMemberRow {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_OPTIONS = [
  ["owner", "Business Owner"],
  ["manager", "Business Manager"],
  ["member", "Team Member"],
  ["read_only", "Read-Only User"],
] as const;

export function TeamManager({
  members,
  currentUserId,
  canManage,
}: {
  members: TeamMemberRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [formKey, setFormKey] = React.useState(0);
  const [inviteState, inviteAction] = useActionState<TeamActionState, FormData>(
    async (prev, fd) => {
      const result = await inviteMember(prev, fd);
      if (result.success) setFormKey((k) => k + 1);
      return result;
    },
    {},
  );
  const [roleState, roleAction] = useActionState<TeamActionState, FormData>(changeMemberRole, {});
  const [removeState, removeAction] = useActionState<TeamActionState, FormData>(removeMember, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form key={formKey} action={inviteAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
          <h3 className="text-sm font-semibold text-ink-900">Invite a teammate</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="invite-name">Name</Label>
              <Input id="invite-name" name="name" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select id="invite-role" name="role" className="mt-1" defaultValue="member">
                {ROLE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton>Invite</SubmitButton>
            <FormMessage state={inviteState} />
          </div>
          {inviteState.tempPassword ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
              <p className="font-medium">Share this temporary password securely — it is shown only once:</p>
              <code className="mt-1 block font-mono text-base">{inviteState.tempPassword}</code>
              <p className="mt-1 text-xs">
                Automated invite emails arrive with the email integration in Phase 6.
              </p>
            </div>
          ) : null}
        </form>
      ) : null}

      <FormMessage state={roleState} />
      <FormMessage state={removeState} />
      <ul className="divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
        {members.map((m) => (
          <li key={m.memberId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">
                {m.name}
                {m.userId === currentUserId ? (
                  <span className="ml-2 text-xs text-ink-300">(you)</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-500">{m.email}</p>
            </div>
            {canManage && m.userId !== currentUserId ? (
              <div className="flex items-center gap-2">
                <form action={roleAction} className="flex items-center gap-2">
                  <input type="hidden" name="memberId" value={m.memberId} />
                  <Label htmlFor={`role-${m.memberId}`} className="sr-only">
                    Role for {m.name}
                  </Label>
                  <Select id={`role-${m.memberId}`} name="role" defaultValue={m.role} className="w-44">
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                  <Button type="submit" variant="outline" size="sm">
                    Update
                  </Button>
                </form>
                <form
                  action={removeAction}
                  onSubmit={(e) => {
                    if (!confirm(`Remove ${m.name} from the organization?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="memberId" value={m.memberId} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                    Remove
                  </Button>
                </form>
              </div>
            ) : (
              <Badge variant="brand">{m.role.replaceAll("_", " ")}</Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
