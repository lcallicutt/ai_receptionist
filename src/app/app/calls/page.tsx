import { ComingSoon } from "@/components/portal/coming-soon";

export const metadata = { title: "Call Inbox" };

export default function Page() {
  return (
    <ComingSoon
      title="Call Inbox"
      description="Every call with caller, outcome, lead score, sentiment, and unread status — plus full call detail pages with transcripts and summaries."
      phase="Phase 3"
    />
  );
}
