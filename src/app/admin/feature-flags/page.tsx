import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Feature Flags" };

export default function Page() {
  return (
    <ComingSoon
      title="Feature Flags"
      description="Toggle features globally or per organization."
      phase="Phase 8"
    />
  );
}
