import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceForm, DeletionRequestForm } from "@/components/features/compliance-form";

export const metadata = { title: "Compliance" };

export default async function CompliancePage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;

  const [settings, consents] = await Promise.all([
    db
      .select()
      .from(schema.dataRetentionSettings)
      .where(eq(schema.dataRetentionSettings.organizationId, orgId))
      .limit(1),
    db
      .select()
      .from(schema.consentRecords)
      .where(eq(schema.consentRecords.organizationId, orgId))
      .orderBy(desc(schema.consentRecords.recordedAt))
      .limit(25),
  ]);
  const s = settings[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Compliance</h1>
        <p className="text-sm text-ink-500">
          Recording, retention, consent, and disclaimers for your account
        </p>
      </div>

      <div className="rounded-lg border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
        FlowNet provides configuration controls, not legal advice. These settings help you meet
        your obligations, but they do not by themselves guarantee compliance with recording
        laws, TCPA/SMS consent rules, HIPAA, or professional ethics rules — consult your own
        advisor for your industry and state.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recording & retention</CardTitle>
          <CardDescription>Owner-only settings, recorded in the audit log</CardDescription>
        </CardHeader>
        <CardContent>
          <ComplianceForm
            recordingEnabled={s?.recordingEnabled ?? false}
            recordingDisclosure={s?.recordingDisclosure ?? null}
            recordingRetentionDays={s?.recordingRetentionDays ?? 90}
            transcriptRetentionDays={s?.transcriptRetentionDays ?? 365}
            legalDisclaimer={s?.legalDisclaimer ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data deletion requests</CardTitle>
          <CardDescription>
            Record a caller&apos;s verified deletion request — processed against calls,
            transcripts, recordings, and leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeletionRequestForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent consent records</CardTitle>
          <CardDescription>Opt-ins, opt-outs, and onboarding acknowledgments</CardDescription>
        </CardHeader>
        <CardContent>
          {consents.length === 0 ? (
            <p className="text-sm text-ink-500">No consent records yet.</p>
          ) : (
            <ul className="divide-y divide-ink-300/15">
              {consents.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-700">
                    {c.consentType.replaceAll("_", " ")}
                    <span className="text-ink-300"> · {c.source ?? "system"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={c.granted ? "success" : "danger"}>
                      {c.granted ? "granted" : "revoked"}
                    </Badge>
                    <span className="text-xs text-ink-300">
                      {c.recordedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
