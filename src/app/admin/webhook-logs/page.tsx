import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Webhook Logs" };

export default function Page() {
  return (
    <ComingSoon
      title="Webhook Logs"
      description="Webhook delivery logs with signature status, idempotency keys, and a replay tool."
      phase="Phase 5"
    />
  );
}
