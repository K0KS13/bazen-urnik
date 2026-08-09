"use server";

import { revalidatePath } from "next/cache";
import { computeLateness } from "@/lib/lateness";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMinutes } from "@/lib/time";

export type ActionState = { error?: string; ok?: string };

/** Koliko pred/po načrtovanem začetku še iščemo pripadajočo izmeno. */
const SHIFT_MATCH_HOURS = 6;

/** Prijava na izmeno. Če je vnos brez odjave že odprt, ne naredi ničesar. */
export async function clockInAction(): Promise<ActionState> {
  const user = await requireUser();

  const open = await prisma.timeEntry.findFirst({
    where: { employeeId: user.id, clockOut: null },
    select: { id: true },
  });
  if (open) return { error: "Izmena je že v teku." };

  const clockIn = new Date();
  const window = SHIFT_MATCH_HOURS * 3600000;

  // Načrtovana izmena, ki se ji prijava časovno najbolj prilega.
  const nearbyShifts = await prisma.shift.findMany({
    where: {
      employeeId: user.id,
      start: {
        gte: new Date(clockIn.getTime() - window),
        lte: new Date(clockIn.getTime() + window),
      },
    },
    select: { id: true, start: true },
  });

  const shift = nearbyShifts.reduce<{ id: string; start: Date } | null>(
    (closest, candidate) =>
      !closest ||
      Math.abs(candidate.start.getTime() - clockIn.getTime()) <
        Math.abs(closest.start.getTime() - clockIn.getTime())
        ? candidate
        : closest,
    null,
  );

  const settings = await getSettings();
  const { lateMinutes, penaltyMinutes } = computeLateness(
    clockIn,
    shift?.start ?? null,
    settings,
  );

  await prisma.timeEntry.create({
    data: {
      employeeId: user.id,
      clockIn,
      shiftId: shift?.id ?? null,
      lateMinutes,
      penaltyMinutes,
    },
  });

  revalidatePath("/");
  revalidatePath("/ure");

  if (penaltyMinutes > 0) {
    return {
      ok: `Prijava zabeležena. Zamuda ${lateMinutes} min — odbitek ${formatMinutes(
        penaltyMinutes,
      )} h.`,
    };
  }
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
  const penaltyMinutes = Number(formData.get("penaltyMinutes") ?? 0);
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
  if (
    !Number.isFinite(penaltyMinutes) ||
    penaltyMinutes < 0 ||
    penaltyMinutes > 960
  ) {
    return { error: "Odbitek mora biti med 0 in 960 minutami." };
  }

  await prisma.timeEntry.update({
    where: { id },
    data: {
      clockIn,
      clockOut,
      breakMinutes: Math.round(breakMinutes),
      penaltyMinutes: Math.round(penaltyMinutes),
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
