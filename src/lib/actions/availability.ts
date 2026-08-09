"use server";

import { revalidatePath } from "next/cache";
import { isAvailabilityStatus, WEEKDAYS } from "@/lib/availability";
import { AVAILABILITY_PARTS } from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/actions/time";

/**
 * Zaposleni odda razpoložljivost za cel teden naenkrat, ločeno za dopoldne in
 * popoldne. Deli dneva so isti kot pri izmenah, zato jih samodejni urnik
 * dejansko upošteva.
 */
export async function saveAvailabilityAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const rows = WEEKDAYS.flatMap((weekday) =>
    AVAILABILITY_PARTS.map((partOfDay) => ({
      weekday,
      partOfDay,
      status: String(formData.get(`status-${weekday}-${partOfDay}`) ?? "yes"),
    })),
  );

  if (!rows.every((row) => isAvailabilityStatus(row.status))) {
    return { error: "Neveljavna izbira razpoložljivosti." };
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.availability.upsert({
        where: {
          employeeId_weekday_partOfDay: {
            employeeId: user.id,
            weekday: row.weekday,
            partOfDay: row.partOfDay,
          },
        },
        create: {
          employeeId: user.id,
          weekday: row.weekday,
          partOfDay: row.partOfDay,
          status: row.status,
        },
        update: { status: row.status },
      }),
    ),
  );

  revalidatePath("/razpolozljivost");
  revalidatePath("/urnik");
  return { ok: "Razpoložljivost shranjena." };
}
