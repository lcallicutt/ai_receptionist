import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Leads" };

export default function Page() {
  return (
    <ComingSoon
      title="Leads"
      description="Your lead pipeline — statuses from New to Won, assignments, notes, tags, follow-ups, and CRM sync status."
      phase="Phase 3"
    />
  );
}
