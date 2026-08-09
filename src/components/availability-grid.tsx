"use client";

import { useState } from "react";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type AvailabilityStatus,
} from "@/lib/availability";
import { AVAILABILITY_PARTS, type AvailabilityPart } from "@/lib/parts-of-day";

type Key = `${number}:${AvailabilityPart}`;
type State = Record<string, AvailabilityStatus>;

const PART_LABEL: Record<AvailabilityPart, string> = {
  dopoldan: "Dop",
  popoldan: "Pop",
};

const STATUS_CLASS: Record<AvailabilityStatus, string> = {
  yes: "bg-accent/20 text-accent ring-accent/40",
  maybe: "bg-warning/15 text-warning ring-warning/40",
  no: "bg-danger/15 text-danger ring-danger/40",
};

const STATUS_MARK: Record<AvailabilityStatus, string> = {
  yes: "✓",
  maybe: "?",
  no: "✕",
};

const PRESETS: Array<{ label: string; build: (weekday: number, part: AvailabilityPart) => AvailabilityStatus }> = [
  { label: "Kadarkoli", build: () => "yes" },
  { label: "Samo dopoldne", build: (_, part) => (part === "dopoldan" ? "yes" : "no") },
  { label: "Samo popoldne", build: (_, part) => (part === "popoldan" ? "yes" : "no") },
  { label: "Samo vikend", build: (weekday) => (weekday >= 6 ? "yes" : "no") },
];

/** Naslednje stanje v krogu: lahko → po dogovoru → ne morem → lahko. */
function nextStatus(current: AvailabilityStatus): AvailabilityStatus {
  const index = AVAILABILITY_STATUSES.indexOf(current);
  return AVAILABILITY_STATUSES[(index + 1) % AVAILABILITY_STATUSES.length];
}

/**
 * Razpoložljivost za cel teden, ločeno za dopoldne in popoldne.
 * Klik na polje kroži med tremi stanji — brez tipkanja ur.
 */
export function AvailabilityGrid({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);

  const at = (weekday: number, part: AvailabilityPart): AvailabilityStatus =>
    state[`${weekday}:${part}` satisfies Key] ?? "yes";

  function cycle(weekday: number, part: AvailabilityPart): void {
    setState((current) => ({
      ...current,
      [`${weekday}:${part}`]: nextStatus(at(weekday, part)),
    }));
  }

  function applyPreset(build: (weekday: number, part: AvailabilityPart) => AvailabilityStatus): void {
    const next: State = {};
    for (const weekday of WEEKDAYS) {
      for (const part of AVAILABILITY_PARTS) {
        next[`${weekday}:${part}`] = build(weekday, part);
      }
    }
    setState(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {WEEKDAYS.flatMap((weekday) =>
        AVAILABILITY_PARTS.map((part) => (
          <input
            key={`${weekday}-${part}`}
            type="hidden"
            name={`status-${weekday}-${part}`}
            value={at(weekday, part)}
          />
        )),
      )}

      <div>
        <p className="label">Hitra izbira</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.build)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm">{WEEKDAY_LABELS[weekday]}</span>
            {AVAILABILITY_PARTS.map((part) => {
              const status = at(weekday, part);
              return (
                <button
                  key={part}
                  type="button"
                  onClick={() => cycle(weekday, part)}
                  title={`${PART_LABEL[part]}: ${AVAILABILITY_LABELS[status]}`}
                  className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold ring-1 transition-colors ${STATUS_CLASS[status]}`}
                >
                  {PART_LABEL[part]} {STATUS_MARK[status]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Klikni polje, da zamenjaš stanje: ✓ lahko delam · ? po dogovoru · ✕ ne
        morem. Celodnevna izmena zahteva oboje.
      </p>
    </div>
  );
}
