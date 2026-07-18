import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
        <PhoneCall className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink-900">
        FlowNet<span className="text-brand-700"> AI Receptionist</span>
      </span>
    </Link>
  );
}
