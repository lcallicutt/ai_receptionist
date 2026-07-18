import { requirePlatformAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/portal/admin-shell";

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin();
  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
