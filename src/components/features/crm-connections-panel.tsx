"use client";

import { useActionState } from "react";
import { Database } from "lucide-react";
import { connectGoHighLevel, connectWebhookCrm, disconnectCrm } from "@/lib/actions/crm";
import type { ActionState } from "@/lib/actions/business";
import { Input, Label } from "@/components/ui/input";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form-bits";

interface ConnectionRow {
  id: string;
  provider: string;
  label: string | null;
  webhookUrl: string | null;
  status: string;
}

export function CrmConnectionsPanel({ connection }: { connection: ConnectionRow | null }) {
  const [ghlState, ghlAction] = useActionState<ActionState, FormData>(connectGoHighLevel, {});
  const [hookState, hookAction] = useActionState<ActionState, FormData>(connectWebhookCrm, {});
  const [disconnectState, disconnectAction] = useActionState<ActionState, FormData>(disconnectCrm, {});

  if (connection && connection.status === "connected") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-300/25 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900">
                {connection.label ?? connection.provider}
              </p>
              <p className="text-xs text-ink-500">
                {connection.provider === "webhook"
                  ? connection.webhookUrl
                  : "Contacts, notes, and tags sync automatically after every call"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(connection.status)}>{connection.status}</Badge>
            <form
              action={disconnectAction}
              onSubmit={(e) => {
                if (!confirm("Disconnect this CRM? New leads will stop syncing.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="connectionId" value={connection.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                Disconnect
              </Button>
            </form>
          </div>
        </div>
        <FormMessage state={disconnectState} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={ghlAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">GoHighLevel</h3>
        <p className="text-xs text-ink-500">
          Syncs contacts, call notes, tags, and lead scores to your GoHighLevel location. The key
          is validated, then stored encrypted — it is never shown again or sent to the browser.
        </p>
        <div>
          <Label htmlFor="ghl-key">Location API key</Label>
          <Input id="ghl-key" name="apiKey" type="password" required className="mt-1"
            autoComplete="off" />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>Connect GoHighLevel</SubmitButton>
          <FormMessage state={ghlState} />
        </div>
      </form>

      <form action={hookAction} className="space-y-3 rounded-lg border border-ink-300/25 p-4" noValidate>
        <h3 className="text-sm font-semibold text-ink-900">Webhook CRM</h3>
        <p className="text-xs text-ink-500">
          Works with any webhook-capable CRM, Zapier, Make, or a custom endpoint. Events are
          signed with X-FlowNet-Signature (HMAC-SHA256) when a secret is set. A signed test
          event is delivered before the connection is saved.
        </p>
        <div>
          <Label htmlFor="hook-url">Webhook URL (HTTPS)</Label>
          <Input id="hook-url" name="webhookUrl" type="url" required className="mt-1"
            placeholder="https://your-crm.example/webhooks/flownet" />
        </div>
        <div>
          <Label htmlFor="hook-secret">Signing secret (optional)</Label>
          <Input id="hook-secret" name="secret" type="password" className="mt-1" autoComplete="off" />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>Connect webhook</SubmitButton>
          <FormMessage state={hookState} />
        </div>
      </form>

      <div className="rounded-lg border border-dashed border-ink-300/40 p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">HubSpot</p>
            <p className="text-xs text-ink-500">Coming in a later phase via the same adapter interface.</p>
          </div>
          <Badge variant="outline">planned</Badge>
        </div>
      </div>
    </div>
  );
}
