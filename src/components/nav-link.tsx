"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  badge = 0,
}: {
  href: string;
  label: string;
  /** Število ob napisu; pri 0 se ne izriše. */
  badge?: number;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-accent text-slate-900" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {badge > 0 ? (
        <span
          className={`rounded-full px-1.5 text-xs tabular-nums ${
            active ? "bg-slate-900/20 text-slate-900" : "bg-warning/20 text-warning"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
