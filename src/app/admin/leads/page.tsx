import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Leads" };

export default function Page() {
  return (
    <ComingSoon
      title="Leads"
      description="Platform-wide lead activity, including website demo requests."
      phase="Phase 3"
    />
  );
}
