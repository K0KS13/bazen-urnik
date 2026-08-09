"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager, requireUser } from "@/lib/session";

export type ActionState = { error?: string; ok?: string };

/** Prijava na izmeno. Če je vnos brez odjave že odprt, ne naredi ničesar. */
export async function clockInAction(): Promise<ActionState> {
  const user = await requireUser();

  const open = await prisma.timeEntry.findFirst({
    where: { employeeId: user.id, clockOut: null },
    select: { id: true },
  });
  if (open) return { error: "Izmena je že v teku." };

  await prisma.timeEntry.create({
    data: { employeeId: user.id, clockIn: new Date() },
  });

  revalidatePath("/");
  revalidatePath("/ure");
  return { ok: "Prijava zabeležena." };
}

/** Odjava z izmene, z neobveznim odbitkom odmora v minutah. */
export async function clockOutAction(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const breakMinutes = Number(formData.get("breakMinutes") ?? 0);

  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > 480) {
    return { error: "Odmor mora biti med 0 in 480 minutami." };
  }

  const open = await prisma.timeEntry.findFirst({
    where: { employeeId: user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!open) return { error: "Nimaš odprte izmene." };

  const clockOut = new Date();
  if (clockOut.getTime() - open.clockIn.getTime() < breakMinutes * 60000) {
    return { error: "Odmor je daljši od trajanja izmene." };
  }

  await prisma.timeEntry.update({
    where: { id: open.id },
    data: { clockOut, breakMinutes: Math.round(breakMinutes) },
  });

  revalidatePath("/");
  revalidatePath("/ure");
  return { ok: "Odjava zabeležena." };
}

/** Ročni popravek vnosa — samo vodje izmen; zabeleži se, kdo je popravljal. */
export async function updateTimeEntryAction(
  formData: FormData,
): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const id = String(formData.get("id") ?? "");
  const clockInRaw = String(formData.get("clockIn") ?? "");
  const clockOutRaw = String(formData.get("clockOut") ?? "");
  const breakMinutes = Number(formData.get("breakMinutes") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  const clockIn = new Date(clockInRaw);
  if (Number.isNaN(clockIn.getTime())) return { error: "Neveljaven čas prijave." };

  let clockOut: Date | null = null;
  if (clockOutRaw) {
    clockOut = new Date(clockOutRaw);
    if (Number.isNaN(clockOut.getTime())) {
      return { error: "Neveljaven čas odjave." };
    }
    if (clockOut <= clockIn) {
      return { error: "Odjava mora biti za prijavo." };
    }
  }

  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > 480) {
    return { error: "Odmor mora biti med 0 in 480 minutami." };
  }

  await prisma.timeEntry.update({
    where: { id },
    data: {
      clockIn,
      clockOut,
      breakMinutes: Math.round(breakMinutes),
      note: note || null,
      editedById: manager.id,
      editedAt: new Date(),
    },
  });

  revalidatePath("/ure");
  revalidatePath("/izvoz");
  return { ok: "Vnos popravljen." };
}

export async function deleteTimeEntryAction(
  formData: FormData,
): Promise<ActionState> {
  await requireScheduleManager();
  const id = String(formData.get("id") ?? "");

  await prisma.timeEntry.delete({ where: { id } });

  revalidatePath("/ure");
  revalidatePath("/izvoz");
  return { ok: "Vnos izbrisan." };
}
