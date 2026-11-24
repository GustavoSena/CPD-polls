"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header navigation. Client-side only to mark the current page.
const LINKS = [
  { href: "/suggestions", label: "Sugestões", primary: false },
  { href: "/new", label: "Nova proposta", primary: true },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Principal">
      <Link
        href="/"
        className="nav-link"
        aria-current={pathname === "/" ? "page" : undefined}
      >
        Propostas
      </Link>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={l.primary ? "nav-link nav-link-primary" : "nav-link"}
          aria-current={pathname.startsWith(l.href) ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
