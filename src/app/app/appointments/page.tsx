import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Appointments" };

export default function Page() {
  return (
    <ComingSoon
      title="Appointments"
      description="Upcoming, completed, cancelled, and no-show appointments with confirmation, reminder, and sync status."
      phase="Phase 4"
    />
  );
}
