"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
        active ? "bg-accent text-slate-900" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
