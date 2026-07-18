"use client";

import {
  LayoutDashboard,
  Building2,
  Bot,
  PhoneIncoming,
  Users,
  Gauge,
  CreditCard,
  LayoutTemplate,
  Activity,
  AlertTriangle,
  Webhook,
  ScrollText,
  Wrench,
  Flag,
  Settings,
} from "lucide-react";
import { PortalShell } from "./portal-shell";
import { logoutAction } from "@/lib/auth/actions";

const ICONS = {
  LayoutDashboard,
  Building2,
  Bot,
  PhoneIncoming,
  Users,
  Gauge,
  CreditCard,
  LayoutTemplate,
  Activity,
  AlertTriangle,
  Webhook,
  ScrollText,
  Wrench,
  Flag,
  Settings,
};

const NAV = [
  {
    heading: "Platform",
    items: [
      { href: "/admin", label: "Platform Dashboard", iconName: "LayoutDashboard" },
      { href: "/admin/organizations", label: "Organizations", iconName: "Building2" },
      { href: "/admin/receptionists", label: "Receptionists", iconName: "Bot" },
      { href: "/admin/calls", label: "Calls", iconName: "PhoneIncoming" },
      { href: "/admin/leads", label: "Leads", iconName: "Users" },
      { href: "/admin/usage", label: "Usage", iconName: "Gauge" },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { href: "/admin/plans", label: "Plans", iconName: "CreditCard" },
      { href: "/admin/templates", label: "Templates", iconName: "LayoutTemplate" },
      { href: "/admin/feature-flags", label: "Feature Flags", iconName: "Flag" },
      { href: "/admin/system", label: "System Settings", iconName: "Settings" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { href: "/admin/provider-health", label: "Provider Health", iconName: "Activity" },
      { href: "/admin/failed-workflows", label: "Failed Workflows", iconName: "AlertTriangle" },
      { href: "/admin/webhook-logs", label: "Webhook Logs", iconName: "Webhook" },
      { href: "/admin/audit-logs", label: "Audit Logs", iconName: "ScrollText" },
      { href: "/admin/support", label: "Support Tools", iconName: "Wrench" },
    ],
  },
];

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      portalName="FlowNet Admin"
      homeHref="/admin"
      nav={NAV}
      icons={ICONS}
      userName={userName}
      orgName="FlowNet Automation"
      onLogout={() => void logoutAction()}
    >
      {children}
    </PortalShell>
  );
}
