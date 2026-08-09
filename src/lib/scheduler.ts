import type { AvailabilityStatus } from "@/lib/availability";

/**
 * Samodejno sestavljanje urnika.
 *
 * Prednost ima **pokritost izmen**: cilj je zapolniti čim več mest. Tedenski
 * cilj ur je mehka omejitev — najprej razporejamo tiste, ki cilja še niso
 * dosegli, in šele če mesto sicer ostane prazno, sežemo tudi čez cilj.
 *
 * Funkcija je namenoma brez dostopa do baze, da jo je mogoče preveriti sámo.
 */

export type SchedulerCandidate = {
  id: string;
  /// Ocena po delovnem mestu; manjkajoče delovno mesto pomeni oceno 0.
  skillByPosition: Record<string, number>;
  /// Razpoložljivost po dnevih (1–7); manjkajoč dan pomeni "yes".
  availabilityByWeekday: Record<number, AvailabilityStatus>;
  /// Dnevi z odobreno odsotnostjo, v obliki "2026-08-09".
  absentDays: Set<string>;
  weeklyHoursTarget: number | null;
  /// Minute, ki jih ta teden že ima iz obstoječih izmen.
  assignedMinutes: number;
  /// Zasedeni termini (obstoječe izmene) kot časovni žigi.
  busy: Array<{ start: number; end: number }>;
  /// Za predvidljiv vrstni red pri izenačenju.
  sortKey: string;
};

export type SchedulerSlot = {
  templateId: string;
  positionId: string;
  positionName: string;
  start: Date;
  end: Date;
  peopleNeeded: number;
  minLevel: number;
  leadLevel: number | null;
};

export type SchedulerResult = {
  assignments: Array<{ employeeId: string; slot: SchedulerSlot }>;
  /// Mesta, ki jih ni bilo mogoče zapolniti.
  gaps: Array<{ slot: SchedulerSlot; missing: number }>;
};

function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isoWeekdayOf(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function slotMinutes(slot: SchedulerSlot): number {
  return Math.round((slot.end.getTime() - slot.start.getTime()) / 60000);
}

function availabilityFor(
  candidate: SchedulerCandidate,
  weekday: number,
): AvailabilityStatus {
  return candidate.availabilityByWeekday[weekday] ?? "yes";
}

function skillFor(candidate: SchedulerCandidate, positionId: string): number {
  return candidate.skillByPosition[positionId] ?? 0;
}

/** Ali se kandidat v tem terminu prekriva s čim, kar že ima. */
function overlaps(candidate: SchedulerCandidate, slot: SchedulerSlot): boolean {
  const start = slot.start.getTime();
  const end = slot.end.getTime();
  return candidate.busy.some((block) => block.start < end && block.end > start);
}

/** Ali kandidat sploh sme na to mesto (ne glede na cilj ur). */
function isEligible(candidate: SchedulerCandidate, slot: SchedulerSlot): boolean {
  const weekday = isoWeekdayOf(slot.start);

  if (skillFor(candidate, slot.positionId) < slot.minLevel) return false;
  if (availabilityFor(candidate, weekday) === "no") return false;
  if (candidate.absentDays.has(dayKey(slot.start))) return false;
  if (overlaps(candidate, slot)) return false;

  return true;
}

/** Koliko minut kandidatu manjka do tedenskega cilja (brez cilja: 0). */
function deficitMinutes(candidate: SchedulerCandidate): number {
  if (candidate.weeklyHoursTarget === null) return 0;
  return candidate.weeklyHoursTarget * 60 - candidate.assignedMinutes;
}

/**
 * Vrstni red kandidatov za posamezno mesto:
 * najprej tisti, ki so dejansko na voljo (ne »po dogovoru«), nato tisti z
 * največjim primanjkljajem do cilja, nato bolj izkušeni.
 */
function rank(
  a: SchedulerCandidate,
  b: SchedulerCandidate,
  slot: SchedulerSlot,
): number {
  const weekday = isoWeekdayOf(slot.start);

  const availabilityRank = (candidate: SchedulerCandidate) =>
    availabilityFor(candidate, weekday) === "yes" ? 0 : 1;
  const byAvailability = availabilityRank(a) - availabilityRank(b);
  if (byAvailability !== 0) return byAvailability;

  const byDeficit = deficitMinutes(b) - deficitMinutes(a);
  if (byDeficit !== 0) return byDeficit;

  const bySkill =
    skillFor(b, slot.positionId) - skillFor(a, slot.positionId);
  if (bySkill !== 0) return bySkill;

  return a.sortKey.localeCompare(b.sortKey, "sl");
}

function assign(candidate: SchedulerCandidate, slot: SchedulerSlot): void {
  candidate.busy.push({ start: slot.start.getTime(), end: slot.end.getTime() });
  candidate.assignedMinutes += slotMinutes(slot);
}

export function buildSchedule(
  slots: SchedulerSlot[],
  candidates: SchedulerCandidate[],
): SchedulerResult {
  const assignments: SchedulerResult["assignments"] = [];
  const gaps: SchedulerResult["gaps"] = [];

  // Najbolj omejena mesta najprej — sicer jih zasedejo ljudje, ki bi jih
  // drugod lažje nadomestili, in prav ta mesta na koncu ostanejo prazna.
  const ordered = [...slots].sort((a, b) => {
    const eligibleA = candidates.filter((c) => isEligible(c, a)).length;
    const eligibleB = candidates.filter((c) => isEligible(c, b)).length;
    if (eligibleA !== eligibleB) return eligibleA - eligibleB;
    return a.start.getTime() - b.start.getTime();
  });

  for (const slot of ordered) {
    const chosen: SchedulerCandidate[] = [];

    const needsLead = slot.leadLevel !== null;
    const hasLead = () =>
      slot.leadLevel === null ||
      chosen.some((c) => skillFor(c, slot.positionId) >= slot.leadLevel!);

    while (chosen.length < slot.peopleNeeded) {
      const remaining = slot.peopleNeeded - chosen.length;
      // Zadnje prosto mesto mora zapolniti izkušeni, če ga še ni.
      const mustBeLead = needsLead && !hasLead() && remaining === 1;

      const pool = candidates.filter(
        (candidate) =>
          !chosen.includes(candidate) &&
          isEligible(candidate, slot) &&
          (!mustBeLead || skillFor(candidate, slot.positionId) >= slot.leadLevel!),
      );

      // Prvi krog: samo tisti, ki tedenskega cilja še niso dosegli.
      const underTarget = pool.filter(
        (candidate) => deficitMinutes(candidate) >= slotMinutes(slot),
      );
      const source = underTarget.length > 0 ? underTarget : pool;

      const best = source.sort((a, b) => rank(a, b, slot))[0];
      if (!best) break;

      assign(best, slot);
      chosen.push(best);
      assignments.push({ employeeId: best.id, slot });
    }

    if (chosen.length < slot.peopleNeeded) {
      gaps.push({ slot, missing: slot.peopleNeeded - chosen.length });
    }
  }

  return { assignments, gaps };
}

/** Iz predloge naredi konkreten termin na izbrani dan. */
export function slotFromTemplate(
  day: Date,
  template: {
    id: string;
    positionId: string;
    startTime: string;
    endTime: string;
    peopleNeeded: number;
    minLevel: number;
    leadLevel: number | null;
    position: { name: string };
  },
): SchedulerSlot | null {
  const [startHour, startMinute] = template.startTime.split(":").map(Number);
  const [endHour, endMinute] = template.endTime.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;

  const start = new Date(day);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(day);
  end.setHours(endHour, endMinute, 0, 0);
  // Izmena čez polnoč se konča naslednji dan.
  if (end <= start) end.setDate(end.getDate() + 1);

  return {
    templateId: template.id,
    positionId: template.positionId,
    positionName: template.position.name,
    start,
    end,
    peopleNeeded: Math.max(1, template.peopleNeeded),
    minLevel: template.minLevel,
    leadLevel: template.leadLevel,
  };
}
