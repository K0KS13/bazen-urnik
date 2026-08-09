"use server";

import { revalidatePath } from "next/cache";
import { plural } from "@/lib/format";
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

/** Dan, ko je lokal zaprt: vsak tak dan v tednu ali posamezen datum. */
export async function saveClosedDayAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const scope = String(formData.get("scope") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (scope === "weekday") {
    const weekday = Number(formData.get("weekday") ?? 0);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return { error: "Izberi dan v tednu." };
    }

    const existing = await prisma.closedDay.findFirst({
      where: { scope: "weekday", weekday },
      select: { id: true },
    });
    if (existing) return { error: "Ta dan je že označen kot zaprt." };

    await prisma.closedDay.create({
      data: { scope: "weekday", weekday, note: note || null },
    });

    revalidatePath("/nastavitve");
    revalidatePath("/urnik");
    return { ok: "Dan v tednu označen kot zaprt." };
  }

  if (scope === "date") {
    const date = parseLocalDate(String(formData.get("date") ?? ""));
    if (!date) return { error: "Izberi datum." };

    const existing = await prisma.closedDay.findFirst({
      where: { scope: "date", date },
      select: { id: true },
    });
    if (existing) return { error: "Ta datum je že označen kot zaprt." };

    await prisma.closedDay.create({
      data: { scope: "date", date, note: note || null },
    });

    revalidatePath("/nastavitve");
    revalidatePath("/urnik");
    return { ok: "Datum označen kot zaprt." };
  }

  return { error: "Neveljavna vrsta." };
}

export async function deleteClosedDayAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  await prisma.closedDay.delete({ where: { id } });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return { ok: "Odstranjeno — lokal je ta dan spet odprt." };
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

/** Dnevi v tednu, izbrani s potrditvenimi polji. */
function readWeekdays(formData: FormData): number[] {
  return formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);
}

/** Tožilnik, ker se pojavi za predlogom »na«: na 1 dan, na 2 dneva, na 4 dneve. */
const dayWord = (count: number) =>
  plural(count, ["dan", "dneva", "dneve", "dni"]);

/** Doda isto predlogo na vse izbrane dneve hkrati. */
export async function saveShiftTemplateAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const weekdays = readWeekdays(formData);
  const positionId = String(formData.get("positionId") ?? "");
  const partOfDay = String(formData.get("partOfDay") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const peopleNeeded = Number(formData.get("peopleNeeded") ?? 1);
  const minLevel = Number(formData.get("minLevel") ?? 1);
  const leadLevelRaw = String(formData.get("leadLevel") ?? "");

  if (weekdays.length === 0) return { error: "Izberi vsaj en dan." };
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

  // Enaka predloga na istem dnevu je skoraj vedno pomota, zato jo preskočimo.
  const existing = await prisma.shiftTemplate.findMany({
    where: { positionId, startTime, endTime, weekday: { in: weekdays } },
    select: { weekday: true },
  });
  const alreadyThere = new Set(existing.map((row) => row.weekday));
  const toCreate = weekdays.filter((weekday) => !alreadyThere.has(weekday));

  if (toCreate.length === 0) {
    return { error: "Te predloge so na izbranih dnevih že vpisane." };
  }

  await prisma.shiftTemplate.createMany({
    data: toCreate.map((weekday) => ({
      weekday,
      partOfDay,
      positionId,
      startTime,
      endTime,
      peopleNeeded,
      minLevel,
      leadLevel,
    })),
  });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");

  const skipped = weekdays.length - toCreate.length;
  return {
    ok:
      skipped > 0
        ? `Dodano na ${dayWord(toCreate.length)}, ${skipped} preskočenih (že vpisano).`
        : `Dodano na ${dayWord(toCreate.length)}.`,
  };
}

/** Prepiše ves dan predlog na druge dneve — najhitrejša pot do celega tedna. */
export async function copyTemplatesToWeekdaysAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const from = Number(formData.get("fromWeekday") ?? 0);
  const targets = readWeekdays(formData).filter((day) => day !== from);

  if (!Number.isInteger(from) || from < 1 || from > 7) {
    return { error: "Izberi dan, ki ga želiš prepisati." };
  }
  if (targets.length === 0) return { error: "Izberi vsaj en ciljni dan." };

  const source = await prisma.shiftTemplate.findMany({ where: { weekday: from } });
  if (source.length === 0) {
    return { error: "Izbrani dan nima nobene predloge." };
  }

  const existing = await prisma.shiftTemplate.findMany({
    where: { weekday: { in: targets } },
    select: { weekday: true, positionId: true, startTime: true, endTime: true },
  });
  const key = (row: {
    weekday: number;
    positionId: string;
    startTime: string;
    endTime: string;
  }) => `${row.weekday}|${row.positionId}|${row.startTime}|${row.endTime}`;
  const known = new Set(existing.map(key));

  const rows = targets.flatMap((weekday) =>
    source
      .map((template) => ({
        weekday,
        partOfDay: template.partOfDay,
        positionId: template.positionId,
        startTime: template.startTime,
        endTime: template.endTime,
        peopleNeeded: template.peopleNeeded,
        minLevel: template.minLevel,
        leadLevel: template.leadLevel,
      }))
      .filter((row) => !known.has(key(row))),
  );

  if (rows.length === 0) {
    return { error: "Na ciljnih dnevih so te predloge že vpisane." };
  }

  await prisma.shiftTemplate.createMany({ data: rows });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return {
    ok: `Prepisano na ${dayWord(targets.length)} — ${plural(rows.length, [
      "nova predloga",
      "novi predlogi",
      "nove predloge",
      "novih predlog",
    ])}.`,
  };
}

/** Počisti cel dan naenkrat, da ni treba brisati vrstice za vrstico. */
export async function deleteWeekdayTemplatesAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const weekday = Number(formData.get("weekday") ?? 0);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    return { error: "Neveljaven dan." };
  }

  const removed = await prisma.shiftTemplate.deleteMany({ where: { weekday } });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return {
    ok: `Izbrisano: ${plural(removed.count, [
      "predloga",
      "predlogi",
      "predloge",
      "predlog",
    ])}.`,
  };
}

/** Popravek obstoječe predloge; dan in delovno mesto ostaneta ista. */
export async function updateShiftTemplateAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const partOfDay = String(formData.get("partOfDay") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const peopleNeeded = Number(formData.get("peopleNeeded") ?? 1);
  const minLevel = Number(formData.get("minLevel") ?? 1);
  const leadLevelRaw = String(formData.get("leadLevel") ?? "");

  if (!id) return { error: "Manjka predloga." };
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

  await prisma.shiftTemplate.update({
    where: { id },
    data: { partOfDay, startTime, endTime, peopleNeeded, minLevel, leadLevel },
  });

  revalidatePath("/nastavitve");
  revalidatePath("/urnik");
  return { ok: "Predloga popravljena." };
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
