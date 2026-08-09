"use server";

import { revalidatePath } from "next/cache";
import { isAvailabilityStatus, WEEKDAYS } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/actions/time";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function readTime(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? "").trim();
  return TIME_PATTERN.test(value) ? value : null;
}

/** Zaposleni odda razpoložljivost za cel teden naenkrat. */
export async function saveAvailabilityAction(
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const rows = WEEKDAYS.map((weekday) => {
    const status = String(formData.get(`status-${weekday}`) ?? "yes");
    return {
      weekday,
      status,
      fromTime: readTime(formData, `from-${weekday}`),
      toTime: readTime(formData, `to-${weekday}`),
    };
  });

  // Časovnega okvira ne preverjamo glede na vrstni red: konec pred začetkom
  // pomeni čez polnoč (npr. 18:00–02:00), kar je tu povsem običajno.
  if (!rows.every((row) => isAvailabilityStatus(row.status))) {
    return { error: "Neveljavna izbira razpoložljivosti." };
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.availability.upsert({
        where: {
          employeeId_weekday: { employeeId: user.id, weekday: row.weekday },
        },
        create: {
          employeeId: user.id,
          weekday: row.weekday,
          status: row.status,
          fromTime: row.fromTime,
          toTime: row.toTime,
        },
        update: {
          status: row.status,
          fromTime: row.fromTime,
          toTime: row.toTime,
        },
      }),
    ),
  );

  revalidatePath("/razpolozljivost");
  revalidatePath("/urnik");
  return { ok: "Razpoložljivost shranjena." };
}
