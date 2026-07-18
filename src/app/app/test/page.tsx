import { requireOrgContext } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SimulateCallPanel } from "@/components/features/simulate-call-panel";

export const metadata = { title: "Test Receptionist" };

const CHECKLIST = [
  "Greeting plays exactly as configured",
  "FAQs answered from approved content only",
  "Qualification questions asked in order",
  "Caller details extracted into a lead",
  "Lead scored using your rules",
  "Call summary generated",
  "Timeline of system events recorded",
];

export default async function TestReceptionistPage() {
  await requireOrgContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Test Receptionist</h1>
        <p className="text-sm text-ink-500">
          Exercise the full call pipeline with simulated calls. Live phone test calls arrive with
          the voice integration in Phase 5.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulate an incoming call</CardTitle>
          <CardDescription>
            Creates a clearly-labeled simulated call for your account — it flows through the same
            ingestion pipeline as a real provider webhook: caller record, transcript, summary,
            lead scoring, and timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulateCallPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What the test verifies</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-6 text-sm text-ink-700">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
