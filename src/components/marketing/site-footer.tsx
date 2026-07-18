import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/industries", label: "Industries" },
      { href: "/pricing", label: "Pricing" },
      { href: "/demo", label: "Demo" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/book-a-demo", label: "Book a Demo" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-300/20 bg-surface-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Missed Calls Equal Missed Leads. FlowNet Automation helps small businesses answer
            every call.
          </p>
        </div>
        {FOOTER_LINKS.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h3 className="text-sm font-semibold text-ink-900">{group.heading}</h3>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink-500 hover:text-ink-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-300/20 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} FlowNet Automation LLC. All rights reserved.
      </div>
    </footer>
  );
}
