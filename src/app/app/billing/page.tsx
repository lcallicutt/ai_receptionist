import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Billing" };

export default function Page() {
  return (
    <ComingSoon
      title="Billing"
      description="Your plan, billing status, and invoices. Stripe billing arrives with Phase 9."
      phase="Phase 9"
    />
  );
}
