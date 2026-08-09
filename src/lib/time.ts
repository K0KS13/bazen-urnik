/**
 * Delo s časom.
 *
 * Vsi datumi so v bazi shranjeni kot trenutki v UTC. Prikaz, razvrščanje po
 * dnevih in meje tedna oziroma meseca pa morajo biti v času lokala, sicer se
 * izmena čez polnoč pripiše napačnemu dnevu in mesečni izvoz zajame napačne
 * vnose.
 *
 * Zato tu **nikjer ne uporabljamo časovnega pasu procesa**. Gostitelji tečejo v
 * UTC, razvojni računalnik pa ne, kar bi dalo dva različna izida za iste
 * podatke — nastavljanje `TZ` ob zagonu ni zanesljivo, ker Next.js izrisuje v
 * ločenih delovnih procesih.
 *
 * Pas je zato določen izrecno. Spremenljivka je namenoma **`APP_TIME_ZONE`** in
 * ne `TZ`, da ga pas procesa ne more tiho povoziti; testi to izkoristijo tako,
 * da tečejo v UTC in preverjajo, da so izidi še vedno v času lokala.
 */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Europe/Ljubljana";

const PARTS_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = ponedeljek … 7 = nedelja */
  weekday: number;
};

/** Datum, razstavljen po času lokala. */
export function zonedParts(date: Date): ZonedParts {
  const parts = PARTS_FORMAT.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")) % 24,
    minute: Number(value("minute")),
    second: Number(value("second")),
    weekday: WEEKDAY_INDEX[value("weekday")] ?? 1,
  };
}

/** Odmik pasu od UTC v milisekundah ob danem trenutku. */
function offsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Trenutek, ki v času lokala ustreza podani stenski uri.
 * Drugi prehod popravi izid ob menjavi poletnega in zimskega časa, ko se
 * odmik med prvim ugibanjem in dejanskim trenutkom razlikuje.
 */
export function zonedDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

const DAY_NAMES = ["", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];

const MONTH_NAMES = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTime(date: Date): string {
  const p = zonedParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDate(date: Date): string {
  const p = zonedParts(date);
  return `${DAY_NAMES[p.weekday]} ${p.day}. ${p.month}.`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ob ${formatTime(date)}`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** 1 = ponedeljek … 7 = nedelja, po času lokala. */
export function isoWeekday(date: Date): number {
  return zonedParts(date).weekday;
}

/** Polnoč tistega dne po času lokala. */
export function startOfDay(date: Date): Date {
  const p = zonedParts(date);
  return zonedDate(p.year, p.month, p.day);
}

/** Ponedeljek tekočega tedna, ob polnoči. */
export function startOfWeek(date: Date): Date {
  const p = zonedParts(date);
  return zonedDate(p.year, p.month, p.day - (p.weekday - 1));
}

/** Prišteje cele dneve po koledarju, ne po 24 urah — DST ne premakne ure. */
export function addDays(date: Date, days: number): Date {
  const p = zonedParts(date);
  return zonedDate(p.year, p.month, p.day + days, p.hour, p.minute);
}

/** Sedem dni tedna, začenši s ponedeljkom. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function monthRange(year: number, month: number): { from: Date; to: Date } {
  return {
    from: zonedDate(year, month, 1),
    to: zonedDate(year, month + 1, 1),
  };
}

export function isSameDay(a: Date, b: Date): boolean {
  const x = zonedParts(a);
  const y = zonedParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** Čas med prijavo in odjavo, brez odbitkov. */
export function grossMinutes(entry: {
  clockIn: Date;
  clockOut: Date | null;
}): number {
  if (!entry.clockOut) return 0;
  return Math.max(
    0,
    Math.round((entry.clockOut.getTime() - entry.clockIn.getTime()) / 60000),
  );
}

/** Opravljene minute vnosa, brez odmora in odbitka za zamudo. */
export function workedMinutes(entry: {
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
  penaltyMinutes: number;
}): number {
  if (!entry.clockOut) return 0;
  return Math.max(
    0,
    grossMinutes(entry) - entry.breakMinutes - entry.penaltyMinutes,
  );
}

/** 456 -> "7:36" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.abs(minutes % 60);
  return `${hours}:${pad(rest)}`;
}

/** 456 -> "7,60" (decimalne ure za obračun) */
export function decimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2).replace(".", ",");
}

/** Date -> "2026-08-09T18:30", oblika, ki jo razume <input type="datetime-local">. */
export function toLocalInputValue(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function toLocalDateValue(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-08-09" -> polnoč tistega dne po času lokala, ali null. */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return zonedDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** "2026-08-09" + "16:00" -> trenutek po času lokala, ali null. */
export function parseLocalDateTime(date: string, time: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!day || !clock) return null;

  return zonedDate(
    Number(day[1]),
    Number(day[2]),
    Number(day[3]),
    Number(clock[1]),
    Number(clock[2]),
  );
}

/** Število dni med datumoma, oba vključena. */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86400000) + 1;
}
