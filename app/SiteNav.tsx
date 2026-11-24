"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header navigation (the logo links home). Client-side only to mark the current page. `children`
// is the member slot (MemberNav, a server component) placed before the
// primary "Nova proposta" button.
export function SiteNav({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const current = (active: boolean) => (active ? "page" : undefined);
  return (
    <nav className="site-nav" aria-label="Principal">
      <Link
        href="/suggestions"
        className="nav-link"
        aria-current={current(pathname.startsWith("/suggestions"))}
      >
        Sugestões
      </Link>
      {children}
      <Link
        href="/new"
        className="nav-link nav-link-primary"
        aria-current={current(pathname.startsWith("/new"))}
      >
        Nova proposta
      </Link>
    </nav>
  );
}
