"use client";

import { useState } from "react";
import { WEEKDAY_SHORT, WEEKDAYS } from "@/lib/availability";

const QUICK: Array<{ label: string; days: number[] }> = [
  { label: "Vsi dnevi", days: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Delavniki", days: [1, 2, 3, 4, 5] },
  { label: "Vikend", days: [6, 7] },
];

/**
 * Izbira več dni v tednu naenkrat. Brez tega je treba isto predlogo vpisati
 * sedemkrat, kar je pri več delovnih mestih hitro nekaj deset vnosov.
 */
export function WeekdayPicker({
  name = "weekdays",
  initial = [],
  exclude,
}: {
  name?: string;
  initial?: number[];
  /** Dan, ki ga ni smiselno izbrati (npr. izvorni dan pri kopiranju). */
  exclude?: number;
}) {
  const [selected, setSelected] = useState<number[]>(initial);

  const days = WEEKDAYS.filter((day) => day !== exclude);

  function toggle(day: number): void {
    setSelected((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  }

  function setQuick(days: number[]): void {
    setSelected(days.filter((day) => day !== exclude));
  }

  return (
    <div>
      {selected.map((day) => (
        <input key={day} type="hidden" name={name} value={day} />
      ))}

      <div className="mb-2 flex flex-wrap gap-1.5">
        {QUICK.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setQuick(option.days)}
            className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            {option.label}
          </button>
        ))}
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            Počisti
          </button>
        ) : null}
      </div>

      <div className="flex gap-1">
        {days.map((day) => {
          const active = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(day)}
              className={`flex-1 rounded-lg px-1 py-2 text-xs font-semibold ring-1 transition-colors ${
                active
                  ? "bg-accent text-slate-900 ring-accent"
                  : "bg-surface-2 text-muted ring-border"
              }`}
            >
              {WEEKDAY_SHORT[day]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
