export const PARTS_OF_DAY = ["dopoldan", "celodnevna", "popoldan"] as const;
export type PartOfDay = (typeof PARTS_OF_DAY)[number];

export const PART_LABELS: Record<PartOfDay, string> = {
  dopoldan: "Dopoldan",
  celodnevna: "Čez cel dan",
  popoldan: "Popoldan",
};

/** Barve sledijo obarvanju, ki ga je ekipa uporabljala v preglednici. */
export const PART_CLASS: Record<PartOfDay, string> = {
  dopoldan: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
  celodnevna: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
  popoldan: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
};

export function isPartOfDay(value: string): value is PartOfDay {
  return (PARTS_OF_DAY as readonly string[]).includes(value);
}

/**
 * Deli dneva, po katerih se vodi razpoložljivost. Celodnevne izmene ni na
 * seznamu — zahteva razpoložljivost dopoldne in popoldne.
 */
export const AVAILABILITY_PARTS = ["dopoldan", "popoldan"] as const;
export type AvailabilityPart = (typeof AVAILABILITY_PARTS)[number];

export function isAvailabilityPart(value: string): value is AvailabilityPart {
  return (AVAILABILITY_PARTS as readonly string[]).includes(value);
}

/** Kateri deli dneva morajo biti prosti, da lahko nekdo prevzame to izmeno. */
export function partsRequiredFor(part: string): AvailabilityPart[] {
  if (part === "celodnevna") return ["dopoldan", "popoldan"];
  return isAvailabilityPart(part) ? [part] : ["popoldan"];
}

/**
 * Del dneva za izmene, ki ga nimajo zapisanega (vpisane pred to možnostjo).
 * Sklepamo iz začetka in trajanja: zgodnji začetek je dopoldanska, dolga
 * izmena čez sredino dneva je celodnevna, sicer popoldanska.
 */
export function derivePartOfDay(start: Date, end: Date): PartOfDay {
  const startHour = start.getHours();
  const hours = (end.getTime() - start.getTime()) / 3600000;

  if (startHour < 10) return "dopoldan";
  if (startHour < 15 && hours >= 8) return "celodnevna";
  if (startHour < 15) return "dopoldan";
  return "popoldan";
}

export function partOfShift(shift: {
  partOfDay: string | null;
  start: Date;
  end: Date;
}): PartOfDay {
  if (shift.partOfDay && isPartOfDay(shift.partOfDay)) return shift.partOfDay;
  return derivePartOfDay(shift.start, shift.end);
}

/** Privzete ure posameznega dela dneva iz nastavitev. */
export function defaultTimes(
  part: PartOfDay,
  settings: {
    morningStart: string;
    morningEnd: string;
    alldayStart: string;
    alldayEnd: string;
    eveningStart: string;
    eveningEnd: string;
  },
): { start: string; end: string } {
  switch (part) {
    case "dopoldan":
      return { start: settings.morningStart, end: settings.morningEnd };
    case "celodnevna":
      return { start: settings.alldayStart, end: settings.alldayEnd };
    default:
      return { start: settings.eveningStart, end: settings.eveningEnd };
  }
}
