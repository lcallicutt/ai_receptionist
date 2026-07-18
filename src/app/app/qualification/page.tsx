import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuestionManager } from "@/components/features/question-manager";
import { ScoringRulesManager } from "@/components/features/scoring-rules-manager";

export const metadata = { title: "Qualification" };

export default async function QualificationPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const [questions, scoringRules] = await Promise.all([
    db
      .select()
      .from(schema.qualificationQuestions)
      .where(eq(schema.qualificationQuestions.organizationId, ctx.organization.id))
      .orderBy(asc(schema.qualificationQuestions.sortOrder)),
    db
      .select()
      .from(schema.leadScoringRules)
      .where(eq(schema.leadScoringRules.organizationId, ctx.organization.id)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Lead qualification</h1>
        <p className="text-sm text-ink-500">
          Questions your receptionist asks to qualify callers, with score impact and
          disqualifiers.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Qualification flow</CardTitle>
          <CardDescription>Asked in order when relevant to the caller&apos;s need</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionManager questions={questions} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Lead scoring rules</CardTitle>
          <CardDescription>
            Customize how leads are scored beyond per-question impacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoringRulesManager rules={scoringRules} />
        </CardContent>
      </Card>
    </div>
  );
}
