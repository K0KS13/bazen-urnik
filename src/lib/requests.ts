export const ABSENCE_TYPES = ["dopust", "bolniska", "drugo"] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  dopust: "Dopust",
  bolniska: "Bolniška",
  drugo: "Drugo",
};

export function isAbsenceType(value: string): value is AbsenceType {
  return (ABSENCE_TYPES as readonly string[]).includes(value);
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Čaka odobritev",
  approved: "Odobreno",
  rejected: "Zavrnjeno",
  open: "Na voljo",
  claimed: "Čaka potrditev",
  cancelled: "Preklicano",
};

/** Barva značke glede na stanje prošnje. */
export function statusClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-accent/20 text-accent";
    case "rejected":
    case "cancelled":
      return "bg-danger/15 text-danger";
    case "claimed":
    case "pending":
      return "bg-warning/15 text-warning";
    default:
      return "bg-surface-2 text-muted";
  }
}
