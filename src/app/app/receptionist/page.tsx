import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReceptionistForm } from "@/components/features/receptionist-form";
import { ReceptionistVersions } from "@/components/features/receptionist-versions";

export const metadata = { title: "AI Receptionist" };

export default async function ReceptionistPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();

  const receptionists = await db
    .select()
    .from(schema.aiReceptionists)
    .where(eq(schema.aiReceptionists.organizationId, ctx.organization.id))
    .limit(1);
  const receptionist = receptionists[0] ?? null;

  const versions = receptionist
    ? await db
        .select()
        .from(schema.receptionistVersions)
        .where(eq(schema.receptionistVersions.receptionistId, receptionist.id))
        .orderBy(desc(schema.receptionistVersions.versionNumber))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">AI Receptionist</h1>
        <p className="text-sm text-ink-500">
          Identity, voice, greeting, and call goals. Save drafts freely — changes only go live
          when you publish.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceptionistForm receptionist={receptionist} />
        </CardContent>
      </Card>
      {receptionist ? (
        <Card>
          <CardHeader>
            <CardTitle>Status, publishing & version history</CardTitle>
            <CardDescription>
              Publish a snapshot of the current configuration, or roll back to a prior version.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReceptionistVersions receptionist={receptionist} versions={versions} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
