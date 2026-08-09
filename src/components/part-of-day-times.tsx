"use client";

import { useState } from "react";
import {
  PART_CLASS,
  PART_LABELS,
  PARTS_OF_DAY,
  type PartOfDay,
} from "@/lib/parts-of-day";

/**
 * Izbira dela dneva, ki hkrati prednapolni uri. Ure ostanejo popravljive —
 * privzetki so izhodišče, ne omejitev.
 */
export function PartOfDayTimes({
  defaults,
  initialPart = "popoldan",
}: {
  defaults: Record<PartOfDay, { start: string; end: string }>;
  initialPart?: PartOfDay;
}) {
  const [part, setPart] = useState<PartOfDay>(initialPart);
  const [start, setStart] = useState(defaults[initialPart].start);
  const [end, setEnd] = useState(defaults[initialPart].end);

  function choose(next: PartOfDay): void {
    setPart(next);
    setStart(defaults[next].start);
    setEnd(defaults[next].end);
  }

  return (
    <>
      <input type="hidden" name="partOfDay" value={part} />

      <div>
        <p className="label">Del dneva</p>
        <div className="flex gap-1.5">
          {PARTS_OF_DAY.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ring-1 transition-colors ${
                part === option
                  ? PART_CLASS[option]
                  : "bg-surface-2 text-muted ring-border"
              }`}
            >
              {PART_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="startTime">
            Začetek
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            className="field"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="endTime">
            Konec
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            className="field"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </div>
      </div>
    </>
  );
}
