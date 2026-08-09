"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAbsenceType } from "@/lib/requests";
import { requireScheduleManager, requireUser } from "@/lib/session";
import { addDays, daysBetween, parseLocalDate } from "@/lib/time";
import type { ActionState } from "@/lib/actions/time";

/** Najdaljša odsotnost, ki jo je smiselno vpisati naenkrat. */
const MAX_DAYS = 120;

export async function requestAbsenceAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const type = String(formData.get("type") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const startDate = parseLocalDate(String(formData.get("startDate") ?? ""));
  const endDate = parseLocalDate(String(formData.get("endDate") ?? ""));

  if (!isAbsenceType(type)) return { error: "Izberi vrsto odsotnosti." };
  if (!startDate || !endDate) return { error: "Izpolni oba datuma." };
  if (endDate < startDate) return { error: "Zadnji dan je pred prvim." };
  if (daysBetween(startDate, endDate) > MAX_DAYS) {
    return { error: `Odsotnost naj ne presega ${MAX_DAYS} dni.` };
  }

  // Dvojna vloga za isto obdobje je skoraj vedno pomota.
  const overlapping = await prisma.absence.findFirst({
    where: {
      employeeId: user.id,
      status: { in: ["pending", "approved"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });
  if (overlapping) {
    return { error: "Za to obdobje je vloga že oddana." };
  }

  await prisma.absence.create({
    data: {
      employeeId: user.id,
      type,
      startDate,
      endDate,
      reason: reason || null,
    },
  });

  revalidatePath("/odsotnosti");
  revalidatePath("/");
  return { ok: "Vloga oddana. Vodja jo bo pregledal." };
}

export async function decideAbsenceAction(
  formData: FormData,
): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const decisionNote = String(formData.get("decisionNote") ?? "").trim();

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Neveljavna odločitev." };
  }

  const absence = await prisma.absence.findUnique({
    where: { id },
    select: { employeeId: true, startDate: true, endDate: true, status: true },
  });
  if (!absence) return { error: "Vloge ni več." };
  if (absence.status !== "pending") {
    return { error: "O tej vlogi je že bilo odločeno." };
  }
  // Vodja izmene ne odloča o svoji lastni vlogi; vodstvo lahko o vsem.
  if (absence.employeeId === manager.id && manager.role !== "admin") {
    return { error: "Svoje vloge ne moreš odobriti sam/a — potrdi jo vodstvo." };
  }

  await prisma.absence.update({
    where: { id },
    data: {
      status: decision,
      decidedById: manager.id,
      decidedAt: new Date(),
      decisionNote: decisionNote || null,
    },
  });

  revalidatePath("/odsotnosti");
  revalidatePath("/urnik");
  revalidatePath("/");

  if (decision === "rejected") return { ok: "Vloga zavrnjena." };

  // Odobrena odsotnost ne izbriše že vpisanih izmen — vodja mora vedeti,
  // da jih je treba prerazporediti.
  const clashing = await prisma.shift.count({
    where: {
      employeeId: absence.employeeId,
      start: { gte: absence.startDate, lt: addDays(absence.endDate, 1) },
    },
  });

  return {
    ok:
      clashing > 0
        ? `Odobreno. Pozor: v tem obdobju je vpisanih še ${clashing} izmen — prerazporedi jih.`
        : "Odobreno.",
  };
}

/** Zaposleni umakne svojo vlogo, dokler o njej še ni bilo odločeno. */
export async function cancelAbsenceAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const absence = await prisma.absence.findUnique({
    where: { id },
    select: { employeeId: true, status: true },
  });
  if (!absence) return { error: "Vloge ni več." };
  if (absence.employeeId !== user.id) return { error: "To ni tvoja vloga." };
  if (absence.status !== "pending") {
    return { error: "O vlogi je že bilo odločeno — obrni se na vodjo." };
  }

  await prisma.absence.delete({ where: { id } });

  revalidatePath("/odsotnosti");
  revalidatePath("/");
  return { ok: "Vloga umaknjena." };
}
