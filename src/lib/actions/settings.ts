"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { parseLocalDate } from "@/lib/time";
import type { ActionState } from "@/lib/actions/time";

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

export async function deletePayRuleAction(
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  await prisma.payRule.delete({ where: { id } });

  refresh();
  return { ok: "Pravilo izbrisano." };
}
