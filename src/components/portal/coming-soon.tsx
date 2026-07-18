import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
      <div className="mt-6">
        <EmptyState
          icon={Construction}
          title={`${title} is coming in ${phase}`}
          description={description}
        />
      </div>
    </div>
  );
}
