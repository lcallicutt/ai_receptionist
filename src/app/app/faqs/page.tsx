import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FaqManager } from "@/components/features/faq-manager";

export const metadata = { title: "FAQs" };

export default async function FaqsPage() {
  const ctx = await requireOrgContext();
  const db = await getDb();
  const faqs = await db
    .select()
    .from(schema.faqs)
    .where(eq(schema.faqs.organizationId, ctx.organization.id))
    .orderBy(asc(schema.faqs.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">FAQs</h1>
        <p className="text-sm text-ink-500">
          The approved questions and answers your receptionist can use on calls.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Knowledge base</CardTitle>
          <CardDescription>
            {faqs.length} FAQ{faqs.length === 1 ? "" : "s"} · order determines matching priority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FaqManager faqs={faqs} />
        </CardContent>
      </Card>
    </div>
  );
}
