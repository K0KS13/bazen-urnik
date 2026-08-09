"use server";

import { revalidatePath } from "next/cache";
import { isClosed } from "@/lib/closed-days";
import { plural } from "@/lib/format";
import {
  derivePartOfDay,
  isPartOfDay,
  partsRequiredFor,
} from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager } from "@/lib/session";
import { addDays, isoWeekday, parseLocalDate, startOfWeek } from "@/lib/time";
import type { ActionState } from "@/lib/actions/time";

/** Ali ima zaposleni na dan te izmene odobreno odsotnost. */
async function isAbsent(employeeId: string, day: Date): Promise<boolean> {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const absence = await prisma.absence.findFirst({
    where: {
      employeeId,
      status: "approved",
      startDate: { lte: dayStart },
      endDate: { gte: dayStart },
    },
    select: { id: true },
  });
  return absence !== null;
}

export async function createShiftAction(formData: FormData): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const employeeId = String(formData.get("employeeId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const positionId = String(formData.get("positionId") ?? "");
  const partOfDayRaw = String(formData.get("partOfDay") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const partOfDay = isPartOfDay(partOfDayRaw) ? partOfDayRaw : null;

  // Ime delovnega mesta zapišemo tudi kot besedilo, da izmena ostane berljiva,
  // če se šifrant pozneje spremeni.
  const positionRecord = positionId
    ? await prisma.position.findUnique({
        where: { id: positionId },
        select: { id: true, name: true },
      })
    : null;

  if (!employeeId) return { error: "Izberi zaposlenega." };
  if (!date || !startTime || !endTime) return { error: "Izpolni datum in uri." };

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Neveljaven datum ali ura." };
  }

  // Izmena čez polnoč (npr. 20:00–02:00) se konča naslednji dan.
  if (end <= start) end.setDate(end.getDate() + 1);

  const overlapping = await prisma.shift.findFirst({
    where: { employeeId, start: { lt: end }, end: { gt: start } },
    select: { id: true },
  });
  if (overlapping) {
    return { error: "Ta oseba ima v tem času že vpisano izmeno." };
  }

  if (await isAbsent(employeeId, start)) {
    return { error: "Ta oseba ima tega dne odobreno odsotnost." };
  }

  await prisma.shift.create({
    data: {
      employeeId,
      start,
      end,
      partOfDay: partOfDay ?? derivePartOfDay(start, end),
      position: positionRecord?.name ?? null,
      positionId: positionRecord?.id ?? null,
      note: note || null,
      createdById: manager.id,
    },
  });

  revalidatePath("/urnik");
  revalidatePath("/");

  // Razpoložljivost je okvir, ne prepoved — izmeno vpišemo, a na neujemanje
  // opozorimo, da vodja ve, da se je treba dogovoriti.
  // Celodnevna izmena zahteva oba dela dneva, zato preverimo vse potrebne.
  const shiftPart = partOfDay ?? derivePartOfDay(start, end);
  const availability = await prisma.availability.findMany({
    where: {
      employeeId,
      weekday: isoWeekday(start),
      partOfDay: { in: partsRequiredFor(shiftPart) },
    },
    select: { status: true },
  });
  const statuses = availability.map((row) => row.status);

  // Zaprt dan je opozorilo, ne prepoved — včasih je v lokalu zaprta zabava.
  const closedDays = await prisma.closedDay.findMany();
  if (isClosed(start, closedDays)) {
    return { ok: "Izmena dodana, a ta dan je lokal označen kot zaprt." };
  }

  if (statuses.includes("no")) {
    return { ok: "Izmena dodana, a ta oseba takrat ni na voljo (»ne morem«)." };
  }
  if (statuses.includes("maybe")) {
    return { ok: "Izmena dodana. Ta oseba ima takrat označeno »po dogovoru«." };
  }

  return { ok: "Izmena dodana." };
}

/**
 * Prepiše izmene prejšnjega tedna na izbrani teden. Preskoči neaktivne
 * zaposlene, tiste z odobreno odsotnostjo in izmene, ki v ciljnem tednu že
 * obstajajo — večkratni klik torej ne podvoji urnika.
 */
export async function copyPreviousWeekAction(
  formData: FormData,
): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const targetWeek = parseLocalDate(String(formData.get("weekStart") ?? ""));
  if (!targetWeek) return { error: "Neveljaven teden." };

  const target = startOfWeek(targetWeek);
  const source = addDays(target, -7);

  const sourceShifts = await prisma.shift.findMany({
    where: {
      start: { gte: source, lt: target },
      employee: { active: true },
    },
    orderBy: { start: "asc" },
  });

  if (sourceShifts.length === 0) {
    return { error: "Prejšnji teden nima vpisanih izmen." };
  }

  const closedDays = await prisma.closedDay.findMany();

  let copied = 0;
  let skipped = 0;

  for (const shift of sourceShifts) {
    const start = addDays(shift.start, 7);
    const end = addDays(shift.end, 7);

    const clash = await prisma.shift.findFirst({
      where: { employeeId: shift.employeeId, start: { lt: end }, end: { gt: start } },
      select: { id: true },
    });
    if (clash || isClosed(start, closedDays) || (await isAbsent(shift.employeeId, start))) {
      skipped += 1;
      continue;
    }

    await prisma.shift.create({
      data: {
        employeeId: shift.employeeId,
        start,
        end,
        partOfDay: shift.partOfDay,
        position: shift.position,
        positionId: shift.positionId,
        note: shift.note,
        createdById: manager.id,
      },
    });
    copied += 1;
  }

  revalidatePath("/urnik");
  revalidatePath("/");

  const shiftWord = (count: number) =>
    plural(count, ["izmena", "izmeni", "izmene", "izmen"]);

  return {
    ok:
      skipped > 0
        ? `Prepisano: ${shiftWord(copied)}. Preskočeno: ${shiftWord(skipped)} ` +
          "(zaprt dan, odsotnost ali že vpisana izmena)."
        : `Prepisano: ${shiftWord(copied)}.`,
  };
}

export async function deleteShiftAction(formData: FormData): Promise<ActionState> {
  await requireScheduleManager();
  const id = String(formData.get("id") ?? "");

  await prisma.shift.delete({ where: { id } });

  revalidatePath("/urnik");
  revalidatePath("/");
  return { ok: "Izmena izbrisana." };
}
