import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Provider Health" };

export default function Page() {
  return (
    <ComingSoon
      title="Provider Health"
      description="Live status of telephony, voice AI, calendar, CRM, and email provider connections."
      phase="Phase 5"
    />
  );
}
