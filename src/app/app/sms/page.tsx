import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "SMS Activity" };

export default function Page() {
  return (
    <ComingSoon
      title="SMS Activity"
      description="Missed-call text-back conversations and confirmation messages, with delivery status and opt-out tracking."
      phase="Phase 7"
    />
  );
}
