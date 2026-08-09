import { isoWeekday, isSameDay } from "@/lib/time";

export type ClosedDayLike = {
  scope: string;
  weekday: number | null;
  date: Date | null;
  note?: string | null;
};

/**
 * Ali je lokal ta dan zaprt. Pravilo za konkreten datum in pravilo za dan v
 * tednu sta enakovredna — dovolj je, da velja eno.
 */
export function closedRuleFor(
  date: Date,
  rules: ClosedDayLike[],
): ClosedDayLike | null {
  const byDate = rules.find(
    (rule) => rule.scope === "date" && rule.date && isSameDay(rule.date, date),
  );
  if (byDate) return byDate;

  const weekday = isoWeekday(date);
  return (
    rules.find(
      (rule) => rule.scope === "weekday" && rule.weekday === weekday,
    ) ?? null
  );
}

export function isClosed(date: Date, rules: ClosedDayLike[]): boolean {
  return closedRuleFor(date, rules) !== null;
}
