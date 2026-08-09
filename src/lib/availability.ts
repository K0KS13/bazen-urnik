export const AVAILABILITY_STATUSES = ["yes", "maybe", "no"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  yes: "Lahko delam",
  maybe: "Po dogovoru",
  no: "Ne morem",
};

/** Kratka oznaka za mrežo razpoložljivosti. */
export const AVAILABILITY_SHORT: Record<AvailabilityStatus, string> = {
  yes: "da",
  maybe: "?",
  no: "ne",
};

export const AVAILABILITY_CLASS: Record<AvailabilityStatus, string> = {
  yes: "bg-accent/20 text-accent",
  maybe: "bg-warning/15 text-warning",
  no: "bg-danger/15 text-danger",
};

export function isAvailabilityStatus(value: string): value is AvailabilityStatus {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

/** 1 = ponedeljek … 7 = nedelja */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Ponedeljek",
  2: "Torek",
  3: "Sreda",
  4: "Četrtek",
  5: "Petek",
  6: "Sobota",
  7: "Nedelja",
};

export const WEEKDAY_SHORT: Record<number, string> = {
  1: "Pon",
  2: "Tor",
  3: "Sre",
  4: "Čet",
  5: "Pet",
  6: "Sob",
  7: "Ned",
};
