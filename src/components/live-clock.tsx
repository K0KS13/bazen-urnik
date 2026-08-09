"use client";

import { useSyncExternalStore } from "react";

/**
 * Skupna »tikajoča« vrednost za vse ure na strani. Zapisana je kot zunanja
 * shramba (ne kot stanje v učinku), da je posnetek med izrisom stabilen in da
 * strežniški izpis ne odstopa od odjemalčevega.
 */
let currentTime = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick(): void {
  currentTime = Date.now();
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void): () => void {
  if (listeners.size === 0) {
    tick();
    timer = setInterval(tick, 1000);
  }
  listeners.add(notify);

  return () => {
    listeners.delete(notify);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Trenutni čas v milisekundah, ali 0, dokler stran ni priklopljena. */
function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => currentTime,
    () => 0,
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Velika ura na začetni strani. */
export function LiveClock() {
  const now = useNow();
  const date = now ? new Date(now) : null;

  return (
    <p className="font-mono text-5xl font-bold tabular-nums sm:text-6xl">
      {date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "--:--"}
      <span className="text-2xl text-muted">
        {date ? `:${pad(date.getSeconds())}` : ""}
      </span>
    </p>
  );
}

/** Koliko časa že traja odprta izmena. */
export function ElapsedSince({ start }: { start: string }) {
  const now = useNow();
  if (!now) return null;

  const minutes = Math.max(
    0,
    Math.floor((now - new Date(start).getTime()) / 60000),
  );

  return (
    <span className="font-mono tabular-nums">
      {Math.floor(minutes / 60)}:{pad(minutes % 60)}
    </span>
  );
}
