"use server";

import { revalidatePath } from "next/cache";
import { isPartOfDay } from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { parseLocalDate } from "@/lib/time";
import type { ActionState } from "@/lib/actions/time";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function refresh(): void {
  revalidatePath("/nastavitve");
  revalidatePath("/izvoz");
  revalidatePath("/ure");
}

function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export async function updateLateSettingsAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const enabled = formData.get("latePenaltyEnabled") === "on";
  const tolerance = Number(formData.get("lateToleranceMinutes") ?? 0);
  const block = Number(formData.get("lateBlockMinutes") ?? 15);
  const perBlock = Number(formData.get("latePenaltyMinutesPerBlock") ?? 60);

  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 120) {
    return { error: "Tolerance mora biti med 0 in 120 minutami." };
  }
  if (!Number.isFinite(block) || block < 1 || block > 120) {
    return { error: "Blok zamude mora biti med 1 in 120 minutami." };
  }
  if (!Number.isFinite(perBlock) || perBlock < 0 || perBlock > 480) {
    return { error: "Odbitek na blok mora biti med 0 in 480 minutami." };
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      latePenaltyEnabled: enabled,
      lateToleranceMinutes: Math.round(tolerance),
      lateBlockMinutes: Math.round(block),
      latePenaltyMinutesPerBlock: Math.round(perBlock),
    },
    update: {
      latePenaltyEnabled: enabled,
      lateToleranceMinutes: Math.round(tolerance),
      lateBlockMinutes: Math.round(block),
      latePenaltyMinutesPerBlock: Math.round(perBlock),
    },
  });

  refresh();
  return {
    ok: enabled
      ? "Shranjeno. Odbitki veljajo za prijave od zdaj naprej."
      : "Shranjeno. Odbijanje ur je izklopljeno.",
  };
}

/** Dodatek za dan v tednu (npr. sobota in nedelja +1 €/h). */
export async function savePayRuleAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const scope = String(formData.get("scope") ?? "");
  const bonus = parseAmount(String(formData.get("bonusPerHour") ?? ""));
  const label = String(formData.get("label") ?? "").trim();

  if (bonus === null || bonus < 0 || bonus > 100) {
    return { error: "Dodatek mora biti med 0 in 100 € na uro." };
  }

  if (scope === "weekday") {
    const weekday = Number(formData.get("weekday") ?? 0);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return { error: "Izberi dan v tednu." };
    }

    const existing = await prisma.payRule.findFirst({
      where: { scope: "weekday", weekday },
      select: { id: true },
    });

    if (existing) {
      await prisma.payRule.update({
        where: { id: existing.id },
        data: { bonusPerHour: bonus, label: label || null },
      });
    } else {
      await prisma.payRule.create({
        data: { scope: "weekday", weekday, bonusPerHour: bonus, label: label || null },
      });
    }

    refresh();
    return { ok: "Dodatek za dan v tednu shranjen." };
  }

  if (scope === "date") {
    const date = parseLocalDate(String(formData.get("date") ?? ""));
    if (!date) return { error: "Izberi datum." };

    const existing = await prisma.payRule.findFirst({
      where: { scope: "date", date },
      select: { id: true },
    });

    if (existing) {
      await prisma.payRule.update({
        where: { id: existing.id },
        data: { bonusPerHour: bonus, label: label || null },
      });
    } else {
      await prisma.payRule.create({
        data: { scope: "date", date, bonusPerHour: bonus, label: label || null },
      });
    }

    refresh();
    return {
      ok: "Dodatek za datum shranjen. Velja tudi za že zabeležene ure tega dne.",
    };
  }

  return { error: "Neveljavna vrsta pravila." };
}

/** Privzete ure za dopoldansko, celodnevno in popoldansko izmeno. */
export async function updateShiftHoursAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const fields = [
    "morningStart",
    "morningEnd",
    "alldayStart",
    "alldayEnd",
    "eveningStart",
    "eveningEnd",
  ] as const;

  const values = {} as Record<(typeof fields)[number], string>;
  for (const field of fields) {
    const value = String(formData.get(field) ?? "");
    if (!TIME_PATTERN.test(value)) {
      return { error: "Vpiši veljavne ure (npr. 16:00)." };
    }
    values[field] = value;
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...values },
    update: values,
  });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return { ok: "Privzete ure shranjene." };
}

const DEFAULT_POSITIONS = ["Šank", "Kuhinja", "Strežba", "Bazen"];

/** Ob prvem zagonu ponudimo običajna delovna mesta, da ni treba tipkati. */
export async function addDefaultPositionsAction(): Promise<ActionState> {
  await requireAdmin();

  const existing = await prisma.position.count();
  if (existing > 0) return { error: "Delovna mesta so že vpisana." };

  await prisma.position.createMany({
    data: DEFAULT_POSITIONS.map((name, index) => ({ name, sortOrder: index })),
  });

  revalidatePath("/nastavitve");
  revalidatePath("/zaposleni");
  return { ok: "Dodana privzeta delovna mesta." };
}

export async function createPositionAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vpiši ime delovnega mesta." };

  const existing = await prisma.position.findUnique({ where: { name } });
  if (existing) return { error: "To delovno mesto že obstaja." };

  const count = await prisma.position.count();
  await prisma.position.create({ data: { name, sortOrder: count } });

  revalidatePath("/nastavitve");
  revalidatePath("/zaposleni");
  return { ok: `Delovno mesto »${name}« dodano.` };
}

export async function deletePositionAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  // Izmene, ki so že vpisane, obdržijo besedilno oznako delovnega mesta.
  await prisma.position.delete({ where: { id } });

  revalidatePath("/nastavitve");
  revalidatePath("/zaposleni");
  return { ok: "Delovno mesto izbrisano." };
}

export async function saveShiftTemplateAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const weekday = Number(formData.get("weekday") ?? 0);
  const positionId = String(formData.get("positionId") ?? "");
  const partOfDay = String(formData.get("partOfDay") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const peopleNeeded = Number(formData.get("peopleNeeded") ?? 1);
  const minLevel = Number(formData.get("minLevel") ?? 1);
  const leadLevelRaw = String(formData.get("leadLevel") ?? "");

  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    return { error: "Izberi dan v tednu." };
  }
  if (!positionId) return { error: "Izberi delovno mesto." };
  if (!isPartOfDay(partOfDay)) return { error: "Izberi del dneva." };
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return { error: "Vpiši veljavni uri (npr. 16:00)." };
  }
  if (!Number.isInteger(peopleNeeded) || peopleNeeded < 1 || peopleNeeded > 20) {
    return { error: "Število ljudi mora biti med 1 in 20." };
  }
  if (!Number.isInteger(minLevel) || minLevel < 0 || minLevel > 5) {
    return { error: "Najnižja ocena mora biti med 0 in 5." };
  }

  const leadLevel = leadLevelRaw ? Number(leadLevelRaw) : null;
  if (
    leadLevel !== null &&
    (!Number.isInteger(leadLevel) || leadLevel < 1 || leadLevel > 5)
  ) {
    return { error: "Ocena izkušenega mora biti med 1 in 5." };
  }

  await prisma.shiftTemplate.create({
    data: {
      weekday,
      partOfDay,
      positionId,
      startTime,
      endTime,
      peopleNeeded,
      minLevel,
      leadLevel,
    },
  });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return { ok: "Predloga izmene dodana." };
}

export async function deleteShiftTemplateAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  await prisma.shiftTemplate.delete({ where: { id } });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return { ok: "Predloga izbrisana." };
}

export async function deletePayRuleAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  await prisma.payRule.delete({ where: { id } });

  refresh();
  return { ok: "Pravilo izbrisano." };
}
