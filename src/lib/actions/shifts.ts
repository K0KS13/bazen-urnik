"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager } from "@/lib/session";
import type { ActionState } from "@/lib/actions/time";

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
  return { ok: "Izmena dodana." };
}

export async function deleteShiftAction(formData: FormData): Promise<ActionState> {
  await requireScheduleManager();
  const id = String(formData.get("id") ?? "");

  await prisma.shift.delete({ where: { id } });

  revalidatePath("/urnik");
  revalidatePath("/");
  return { ok: "Izmena izbrisana." };
}
