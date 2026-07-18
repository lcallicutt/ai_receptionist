import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FlowNet AI Receptionist — Missed Calls Equal Missed Leads",
    template: "%s | FlowNet AI Receptionist",
  },
  description:
    "Your AI receptionist answers customer calls, qualifies leads, checks availability, and books appointments—even when your team cannot answer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
