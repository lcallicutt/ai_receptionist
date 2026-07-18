import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Notifications" };

export default function Page() {
  return (
    <ComingSoon
      title="Notifications"
      description="Configure call summaries, high-priority lead alerts, appointment alerts, daily digests, and weekly summaries."
      phase="Phase 2"
    />
  );
}
