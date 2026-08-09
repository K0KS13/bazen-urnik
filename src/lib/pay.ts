import { isoWeekday, isSameDay } from "@/lib/time";

export type PayRuleLike = {
  scope: string;
  weekday: number | null;
  date: Date | null;
  bonusPerHour: number;
  label?: string | null;
};

/**
 * Dodatek na uro za posamezen dan. Pravilo za konkreten datum (npr. praznik ali
 * naknadno dogovorjen bonus) prevlada nad pravilom za dan v tednu.
 *
 * Dodatki se namenoma računajo iz trenutnih pravil in se ne shranjujejo k
 * vnosu ur — tako jih je mogoče dodati tudi za nazaj in se stari meseci
 * preračunajo sami.
 */
export function bonusForDate(date: Date, rules: PayRuleLike[]): number {
  const dateRule = rules.find(
    (rule) => rule.scope === "date" && rule.date && isSameDay(rule.date, date),
  );
  if (dateRule) return dateRule.bonusPerHour;

  const weekday = isoWeekday(date);
  const weekdayRule = rules.find(
    (rule) => rule.scope === "weekday" && rule.weekday === weekday,
  );
  return weekdayRule?.bonusPerHour ?? 0;
}

/** Veljavna urna postavka za ta dan: osnovna postavka zaposlenega + dodatek. */
export function rateForDate(
  date: Date,
  baseRate: number | null,
  rules: PayRuleLike[],
): number | null {
  if (baseRate === null) return null;
  return baseRate + bonusForDate(date, rules);
}

/** Bruto znesek za opravljene minute po postavki, ki velja tisti dan. */
export function grossPay(
  date: Date,
  minutes: number,
  baseRate: number | null,
  rules: PayRuleLike[],
): number | null {
  const rate = rateForDate(date, baseRate, rules);
  if (rate === null) return null;
  return (minutes / 60) * rate;
}
