"use client";

import {
  LayoutDashboard,
  Rocket,
  Bot,
  FileText,
  MessagesSquare,
  ListChecks,
  CalendarDays,
  CalendarCog,
  Database,
  Phone,
  PhoneIncoming,
  Users,
  MessageSquareText,
  Bell,
  BarChart3,
  Gauge,
  UserCog,
  CreditCard,
  Settings,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { PortalShell } from "./portal-shell";
import { logoutAction } from "@/lib/auth/actions";

const ICONS = {
  LayoutDashboard,
  Rocket,
  Bot,
  FileText,
  MessagesSquare,
  ListChecks,
  CalendarDays,
  CalendarCog,
  Database,
  Phone,
  PhoneIncoming,
  Users,
  MessageSquareText,
  Bell,
  BarChart3,
  Gauge,
  UserCog,
  CreditCard,
  Settings,
  ShieldCheck,
  FlaskConical,
};

const NAV = [
  {
    heading: "Overview",
    items: [
      { href: "/app", label: "Dashboard", iconName: "LayoutDashboard" },
      { href: "/app/onboarding", label: "Onboarding", iconName: "Rocket" },
    ],
  },
  {
    heading: "Receptionist",
    items: [
      { href: "/app/receptionist", label: "AI Receptionist", iconName: "Bot" },
      { href: "/app/receptionist/script", label: "Script", iconName: "FileText" },
      { href: "/app/faqs", label: "FAQs", iconName: "MessagesSquare" },
      { href: "/app/qualification", label: "Qualification", iconName: "ListChecks" },
      { href: "/app/test", label: "Test Receptionist", iconName: "FlaskConical" },
    ],
  },
  {
    heading: "Activity",
    items: [
      { href: "/app/calls", label: "Call Inbox", iconName: "PhoneIncoming" },
      { href: "/app/leads", label: "Leads", iconName: "Users" },
      { href: "/app/appointments", label: "Appointments", iconName: "CalendarDays" },
      { href: "/app/sms", label: "SMS Activity", iconName: "MessageSquareText" },
      { href: "/app/analytics", label: "Analytics", iconName: "BarChart3" },
    ],
  },
  {
    heading: "Connections",
    items: [
      { href: "/app/calendars", label: "Calendar Connections", iconName: "CalendarCog" },
      { href: "/app/crm", label: "CRM Connections", iconName: "Database" },
      { href: "/app/phone-numbers", label: "Phone Numbers", iconName: "Phone" },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/app/notifications", label: "Notifications", iconName: "Bell" },
      { href: "/app/usage", label: "Usage", iconName: "Gauge" },
      { href: "/app/team", label: "Team", iconName: "UserCog" },
      { href: "/app/billing", label: "Billing", iconName: "CreditCard" },
      { href: "/app/compliance", label: "Compliance", iconName: "ShieldCheck" },
      { href: "/app/settings", label: "Settings", iconName: "Settings" },
    ],
  },
];

export function ClientShell({
  userName,
  orgName,
  children,
}: {
  userName: string;
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      portalName="FlowNet Portal"
      homeHref="/app"
      nav={NAV}
      icons={ICONS}
      userName={userName}
      orgName={orgName}
      onLogout={() => void logoutAction()}
    >
      {children}
    </PortalShell>
  );
}
