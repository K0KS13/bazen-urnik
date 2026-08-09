"use server";

import { revalidatePath } from "next/cache";
import { plural } from "@/lib/format";
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
  const position = String(formData.get("position") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

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
      position: position || null,
      note: note || null,
      createdById: manager.id,
    },
  });

  revalidatePath("/urnik");
  revalidatePath("/");

  // Razpoložljivost je okvir, ne prepoved — izmeno vpišemo, a na neujemanje
  // opozorimo, da vodja ve, da se je treba dogovoriti.
  const availability = await prisma.availability.findUnique({
    where: {
      employeeId_weekday: { employeeId, weekday: isoWeekday(start) },
    },
    select: { status: true },
  });

  if (availability?.status === "no") {
    return { ok: "Izmena dodana, a ta oseba je za ta dan označila »ne morem«." };
  }
  if (availability?.status === "maybe") {
    return { ok: "Izmena dodana. Ta dan ima oseba označen »po dogovoru«." };
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

  let copied = 0;
  let skipped = 0;

  for (const shift of sourceShifts) {
    const start = addDays(shift.start, 7);
    const end = addDays(shift.end, 7);

    const clash = await prisma.shift.findFirst({
      where: { employeeId: shift.employeeId, start: { lt: end }, end: { gt: start } },
      select: { id: true },
    });
    if (clash || (await isAbsent(shift.employeeId, start))) {
      skipped += 1;
      continue;
    }

    await prisma.shift.create({
      data: {
        employeeId: shift.employeeId,
        start,
        end,
        position: shift.position,
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
          "(odsotnost ali že vpisana izmena)."
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
