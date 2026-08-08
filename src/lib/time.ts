/**
 * Pomožne funkcije za čas. Vsi datumi so v bazi shranjeni kot UTC; prikaz in
 * vnos sta v lokalnem času strežnika/brskalnika, kar za en lokal zadošča.
 */

const DAY_NAMES = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

const MONTH_NAMES = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: Date): string {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()}. ${date.getMonth() + 1}.`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ob ${formatTime(date)}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** Ponedeljek tekočega tedna, ob polnoči. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Sedem dni tedna, začenši s ponedeljkom. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function monthRange(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(year, month - 1, 1, 0, 0, 0, 0),
    to: new Date(year, month, 1, 0, 0, 0, 0),
  };
}

/** Opravljene minute vnosa; vnos brez odjave šteje 0. */
export function workedMinutes(entry: {
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
}): number {
  if (!entry.clockOut) return 0;
  const gross = (entry.clockOut.getTime() - entry.clockIn.getTime()) / 60000;
  return Math.max(0, Math.round(gross) - entry.breakMinutes);
}

/** 456 -> "7:36" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.abs(minutes % 60);
  return `${hours}:${String(rest).padStart(2, "0")}`;
}

/** 456 -> "7,60" (decimalne ure za obračun) */
export function decimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2).replace(".", ",");
}

/** Date -> "2026-08-09T18:30", oblika, ki jo razume <input type="datetime-local">. */
export function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function toLocalDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
