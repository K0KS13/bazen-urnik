"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { requireAdmin, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/actions/time";

const BCRYPT_ROUNDS = 10;

function validatePin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "PIN mora biti 4 števke.";
  if (/^(\d)\1{3}$/.test(pin)) return "PIN ne sme biti štirikrat ista števka.";
  if (pin === "1234" || pin === "0123") return "Ta PIN je preveč očiten.";
  return null;
}

export async function createEmployeeAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const role = String(formData.get("role") ?? "employee");
  const pin = String(formData.get("pin") ?? "");
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").replace(",", ".");

  if (!firstName || !lastName) return { error: "Vpiši ime in priimek." };
  if (!isRole(role)) return { error: "Neveljavna vloga." };

  const pinError = validatePin(pin);
  if (pinError) return { error: pinError };

  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : null;
  if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) {
    return { error: "Neveljavna urna postavka." };
  }

  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      role,
      hourlyRate,
      pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS),
    },
  });

  revalidatePath("/zaposleni");
  return { ok: `${firstName} ${lastName} dodan/a.` };
}

export async function updateEmployeeAction(
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const active = formData.get("active") === "on";
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").replace(",", ".");
  const targetRaw = String(formData.get("weeklyHoursTarget") ?? "").replace(",", ".");

  if (!isRole(role)) return { error: "Neveljavna vloga." };

  const weeklyHoursTarget = targetRaw ? Number(targetRaw) : null;
  if (
    weeklyHoursTarget !== null &&
    (!Number.isFinite(weeklyHoursTarget) ||
      weeklyHoursTarget < 0 ||
      weeklyHoursTarget > 80)
  ) {
    return { error: "Cilj ur mora biti med 0 in 80 na teden." };
  }

  // Brez tega bi si vodstvo lahko po nesreči odvzelo dostop do te strani.
  if (id === admin.id && (role !== "admin" || !active)) {
    return { error: "Sebi ne moreš odvzeti pravic vodstva." };
  }

  const hourlyRate = hourlyRateRaw ? Number(hourlyRateRaw) : null;
  if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) {
    return { error: "Neveljavna urna postavka." };
  }

  await prisma.employee.update({
    where: { id },
    data: { role, active, hourlyRate, weeklyHoursTarget },
  });

  revalidatePath("/zaposleni");
  return { ok: "Shranjeno." };
}

/** Ocene zaposlenega po delovnih mestih (0 = tega dela ne opravlja). */
export async function saveSkillsAction(formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return { error: "Manjka zaposleni." };

  const positions = await prisma.position.findMany({ select: { id: true } });

  const rows = positions.map((position) => ({
    positionId: position.id,
    level: Number(formData.get(`level-${position.id}`) ?? 0),
  }));

  if (rows.some((row) => !Number.isInteger(row.level) || row.level < 0 || row.level > 5)) {
    return { error: "Ocena mora biti med 0 in 5." };
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.employeeSkill.upsert({
        where: {
          employeeId_positionId: { employeeId, positionId: row.positionId },
        },
        create: { employeeId, positionId: row.positionId, level: row.level },
        update: { level: row.level },
      }),
    ),
  );

  revalidatePath("/zaposleni");
  revalidatePath("/urnik");
  return { ok: "Ocene shranjene." };
}

/** Vodstvo ponastavi PIN, kadar ga kdo pozabi. */
export async function resetPinAction(formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const pin = String(formData.get("pin") ?? "");

  const pinError = validatePin(pin);
  if (pinError) return { error: pinError };

  await prisma.employee.update({
    where: { id },
    data: { pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS) },
  });

  revalidatePath("/zaposleni");
  return { ok: "Nov PIN nastavljen." };
}

/** Vsak si lahko sam spremeni PIN, če pozna starega. */
export async function changeOwnPinAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const currentPin = String(formData.get("currentPin") ?? "");
  const newPin = String(formData.get("newPin") ?? "");

  const pinError = validatePin(newPin);
  if (pinError) return { error: pinError };

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: user.id },
    select: { pinHash: true },
  });

  if (!(await bcrypt.compare(currentPin, employee.pinHash))) {
    return { error: "Trenutni PIN ni pravilen." };
  }

  await prisma.employee.update({
    where: { id: user.id },
    data: { pinHash: await bcrypt.hash(newPin, BCRYPT_ROUNDS) },
  });

  return { ok: "PIN spremenjen." };
}

/**
 * Zaposlenega raje deaktiviramo kot brišemo — z brisanjem bi izgubili tudi
 * evidenco ur, ki je podlaga za obračun. Brisanje pustimo le za pomotoma
 * ustvarjene račune brez zgodovine.
 */
export async function deleteEmployeeAction(
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  if (id === admin.id) return { error: "Sebe ne moreš izbrisati." };

  const entries = await prisma.timeEntry.count({ where: { employeeId: id } });
  if (entries > 0) {
    return {
      error:
        "Ta oseba ima zabeležene ure. Namesto brisanja odkljukaj »aktiven/na«.",
    };
  }

  await prisma.employee.delete({ where: { id } });

  revalidatePath("/zaposleni");
  return { ok: "Zaposleni izbrisan." };
}
