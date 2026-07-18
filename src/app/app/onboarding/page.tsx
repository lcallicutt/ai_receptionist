import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Onboarding" };

export default function Page() {
  return (
    <ComingSoon
      title="Onboarding"
      description="The guided 10-step onboarding wizard — business info, receptionist identity, call goals, FAQs, qualification, booking, escalation, notifications, test call, and activation."
      phase="Phase 2"
    />
  );
}
