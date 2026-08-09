"use client";

import { useState, type ReactNode } from "react";

/**
 * Zložljiv razdelek, ki si stanje zapomni sam.
 *
 * Navaden <details open={pogoj}> se po oddaji obrazca zapre, ker se pogoj
 * (npr. »ni še nobene izmene«) medtem spremeni — s tem pa izgine tudi odgovor
 * strežnika, ki je izpisan znotraj njega.
 */
export function Collapsible({
  summary,
  defaultOpen = false,
  className = "card",
  summaryClassName = "cursor-pointer font-semibold",
  children,
}: {
  summary: string;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
