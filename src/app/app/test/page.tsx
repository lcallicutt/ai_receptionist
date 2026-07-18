import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Test Receptionist" };

export default function Page() {
  return (
    <ComingSoon
      title="Test Receptionist"
      description="Launch a test call, watch the live transcript, and verify qualification, booking, CRM logging, and notifications."
      phase="Phase 5"
    />
  );
}
