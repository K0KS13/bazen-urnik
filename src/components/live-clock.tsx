"use client";

import { useEffect, useState } from "react";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Velika ura na začetni strani. Osveži se vsako sekundo. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  // Ura se postavi šele na odjemalcu, sicer bi se strežniški in odjemalčev
  // izpis razlikovala (hydration mismatch).
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="font-mono text-5xl font-bold tabular-nums sm:text-6xl">
      {now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--"}
      <span className="text-2xl text-muted">
        {now ? `:${pad(now.getSeconds())}` : ""}
      </span>
    </p>
  );
}

/** Koliko časa že traja odprta izmena. */
export function ElapsedSince({ start }: { start: string }) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = new Date(start).getTime();
    const update = () =>
      setMinutes(Math.max(0, Math.floor((Date.now() - startedAt) / 60000)));
    update();
    const timer = setInterval(update, 20000);
    return () => clearInterval(timer);
  }, [start]);

  if (minutes === null) return null;

  return (
    <span className="font-mono tabular-nums">
      {Math.floor(minutes / 60)}:{pad(minutes % 60)}
    </span>
  );
}
