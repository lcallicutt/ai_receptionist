import Link from "next/link";
import { asc, and, eq, desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { compileReceptionistScript } from "@/lib/receptionist-script";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Bot } from "lucide-react";

export const metadata = { title: "Receptionist Script" };

export default async function ScriptPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const orgId = ctx.organization.id;

  const [receptionists, faqs, questions, transferRules, escalations] = await Promise.all([
    db.select().from(schema.aiReceptionists).where(eq(schema.aiReceptionists.organizationId, orgId)).limit(1),
    db
      .select()
      .from(schema.faqs)
      .where(and(eq(schema.faqs.organizationId, orgId), eq(schema.faqs.isActive, true)))
      .orderBy(asc(schema.faqs.sortOrder)),
    db
      .select()
      .from(schema.qualificationQuestions)
      .where(
        and(
          eq(schema.qualificationQuestions.organizationId, orgId),
          eq(schema.qualificationQuestions.isActive, true),
        ),
      )
      .orderBy(asc(schema.qualificationQuestions.sortOrder)),
    db.select().from(schema.transferRules).where(eq(schema.transferRules.organizationId, orgId)).limit(1),
    db
      .select()
      .from(schema.escalationRules)
      .where(eq(schema.escalationRules.organizationId, orgId))
      .orderBy(desc(schema.escalationRules.name))
      .limit(1),
  ]);
  const receptionist = receptionists[0];

  if (!receptionist?.greeting) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Receptionist Script</h1>
        <EmptyState
          icon={Bot}
          title="Configure your receptionist first"
          description="The script is compiled from your greeting, FAQs, qualification questions, and escalation rules."
          action={
            <Link href="/app/receptionist" className="text-sm font-medium text-brand-700 hover:underline">
              Go to AI Receptionist settings
            </Link>
          }
        />
      </div>
    );
  }

  const sections = compileReceptionistScript({
    receptionistName: receptionist.name,
    greeting: receptionist.greeting,
    tone: receptionist.tone,
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    qualificationPrompts: questions.map((q) => q.prompt),
    businessKnowledge: receptionist.businessKnowledge,
    restrictedTopics: receptionist.restrictedTopics ?? [],
    complianceStatements: receptionist.complianceStatements ?? [],
    transferRules: transferRules[0]
      ? {
          transferNumber: transferRules[0].transferNumber,
          urgentKeywords: transferRules[0].urgentKeywords ?? [],
          afterHoursBehavior: transferRules[0].afterHoursBehavior,
        }
      : null,
    emergencyLanguage: escalations[0]?.emergencyLanguage ?? null,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Receptionist Script</h1>
        <p className="text-sm text-ink-500">
          The exact guarded script compiled from your configuration — this is what the voice
          provider receives. Edit the underlying pieces on the Receptionist, FAQs,
          Qualification, and Onboarding pages.
        </p>
      </div>
      {sections.map((section) => (
        <Card key={section.heading}>
          <CardHeader>
            <CardTitle>{section.heading}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-ink-700">{section.body}</p>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Guardrails</CardTitle>
          <CardDescription>Always in effect, regardless of configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-ink-700">
            <li>Never invents information beyond the approved knowledge above</li>
            <li>Never provides medical, legal, or financial advice</li>
            <li>Never presents itself as an emergency service</li>
            <li>Honors caller opt-outs and configured restricted topics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
