import { requireOrgContext } from "@/lib/auth/guards";
import { ClientShell } from "@/components/portal/client-shell";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext();
  return (
    <ClientShell userName={ctx.user.name} orgName={ctx.organization.name}>
      {children}
    </ClientShell>
  );
}
