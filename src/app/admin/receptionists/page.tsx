import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Receptionists" };

export default function Page() {
  return (
    <ComingSoon
      title="Receptionists"
      description="All receptionists across the platform with status, provider connections, and configuration health."
      phase="Phase 2"
    />
  );
}
