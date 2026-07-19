"use client";

import { useActionState } from "react";
import {
  publishReceptionist,
  rollbackReceptionist,
  setReceptionistStatus,
} from "@/lib/actions/receptionist";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";
import type { schema } from "@/lib/db";

type Version = typeof schema.receptionistVersions.$inferSelect;
type Receptionist = typeof schema.aiReceptionists.$inferSelect;

export function ReceptionistVersions({
  receptionist,
  versions,
}: {
  receptionist: Receptionist;
  versions: Version[];
}) {
  const [publishState, publishAction] = useActionState<ActionState, FormData>(publishReceptionist, {});
  const [rollbackState, rollbackAction] = useActionState<ActionState, FormData>(rollbackReceptionist, {});
  const [statusState, statusAction] = useActionState<ActionState, FormData>(setReceptionistStatus, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={statusVariant(receptionist.status)}>{receptionist.status}</Badge>
        <form action={statusAction}>
          <input type="hidden" name="status"
            value={receptionist.status === "active" ? "paused" : "active"} />
          <Button type="submit" variant="outline" size="sm">
            {receptionist.status === "active" ? "Pause receptionist" : "Activate receptionist"}
          </Button>
        </form>
        <FormMessage state={statusState} />
      </div>

      <form action={publishAction} className="flex flex-wrap items-end gap-3" noValidate>
        <div>
          <Label htmlFor="publish-label">Version label (optional)</Label>
          <Input id="publish-label" name="label" className="mt-1 w-64"
            placeholder="e.g. New greeting for spring" />
        </div>
        <SubmitButton variant="primary">Publish current draft</SubmitButton>
        <FormMessage state={publishState} />
      </form>

      <div>
        <h3 className="text-sm font-semibold text-ink-900">Version history</h3>
        <FormMessage state={rollbackState} />
        {versions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No published versions yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-300/15 rounded-lg border border-ink-300/25">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    Version {v.versionNumber}
                    {v.label ? <span className="text-ink-500"> — {v.label}</span> : null}
                    {receptionist.activeVersionId === v.id ? (
                      <Badge variant="success" className="ml-2">active</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-300">
                    {v.publishedAt
                      ? `Published ${v.publishedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
                      : "Draft"}
                  </p>
                </div>
                {receptionist.activeVersionId !== v.id ? (
                  <form action={rollbackAction}>
                    <input type="hidden" name="versionId" value={v.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Roll back to this version
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
