import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth/guards";
import { Logo } from "@/components/marketing/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getAuthedUser();
  if (user) redirect(user.isPlatformAdmin ? "/admin" : "/app");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <Logo className="mb-8" />
      <div className="w-full max-w-md rounded-(--radius-card) border border-ink-300/25 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-ink-900">Log in to your portal</h1>
        <p className="mt-1 text-sm text-ink-500">
          Business clients and FlowNet administrators sign in here.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
      <p className="mt-6 max-w-md text-center text-xs text-ink-300">
        Demo environment: try owner@brightpathrealty.example / demo-password-123, or
        admin@flownetautomation.example / admin-password-123 for the FlowNet admin portal.
      </p>
    </div>
  );
}
