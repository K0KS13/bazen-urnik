"use server";

import { revalidatePath } from "next/cache";
import type { AvailabilityStatus } from "@/lib/availability";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  buildSchedule,
  slotFromTemplate,
  type SchedulerCandidate,
  type SchedulerSlot,
} from "@/lib/scheduler";
import { requireScheduleManager } from "@/lib/session";
import { addDays, parseLocalDate, startOfWeek, weekDays } from "@/lib/time";
import type { ActionState } from "@/lib/actions/time";

function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Sestavi urnik izbranega tedna iz predlog, ocen in razpoložljivosti. */
export async function generateWeekAction(
  formData: FormData,
): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const requested = parseLocalDate(String(formData.get("weekStart") ?? ""));
  if (!requested) return { error: "Neveljaven teden." };

  const weekStart = startOfWeek(requested);
  const weekEnd = addDays(weekStart, 7);

  const [templates, employees] = await Promise.all([
    prisma.shiftTemplate.findMany({
      where: { active: true, position: { active: true } },
      include: { position: { select: { name: true } } },
    }),
    prisma.employee.findMany({
      where: { active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        weeklyHoursTarget: true,
        skills: { select: { positionId: true, level: true } },
        availability: { select: { weekday: true, status: true } },
        absences: {
          where: {
            status: "approved",
            startDate: { lt: weekEnd },
            endDate: { gte: weekStart },
          },
          select: { startDate: true, endDate: true },
        },
        shifts: {
          // Zajamemo tudi dan pred tednom zaradi izmen čez polnoč.
          where: { start: { gte: addDays(weekStart, -1), lt: addDays(weekEnd, 1) } },
          select: { start: true, end: true },
        },
      },
    }),
  ]);

  if (templates.length === 0) {
    return {
      error:
        "Ni nastavljenih predlog izmen. Dodaj jih v Nastavitve → Predloge izmen.",
    };
  }

  const slots: SchedulerSlot[] = [];
  for (const day of weekDays(weekStart)) {
    const weekday = day.getDay() === 0 ? 7 : day.getDay();
    for (const template of templates.filter((t) => t.weekday === weekday)) {
      const slot = slotFromTemplate(day, template);
      if (slot) slots.push(slot);
    }
  }

  if (slots.length === 0) {
    return { error: "Za ta teden predloge ne dajo nobene izmene." };
  }

  const candidates: SchedulerCandidate[] = employees.map((employee) => {
    const absentDays = new Set<string>();
    for (const absence of employee.absences) {
      for (
        let day = new Date(absence.startDate);
        day <= absence.endDate;
        day = addDays(day, 1)
      ) {
        absentDays.add(dayKey(day));
      }
    }

    const inWeek = employee.shifts.filter(
      (shift) => shift.start >= weekStart && shift.start < weekEnd,
    );

    return {
      id: employee.id,
      skillByPosition: Object.fromEntries(
        employee.skills.map((skill) => [skill.positionId, skill.level]),
      ),
      availabilityByWeekday: Object.fromEntries(
        employee.availability.map((row) => [
          row.weekday,
          row.status as AvailabilityStatus,
        ]),
      ),
      absentDays,
      weeklyHoursTarget: employee.weeklyHoursTarget,
      assignedMinutes: inWeek.reduce(
        (total, shift) =>
          total + Math.round((shift.end.getTime() - shift.start.getTime()) / 60000),
        0,
      ),
      busy: employee.shifts.map((shift) => ({
        start: shift.start.getTime(),
        end: shift.end.getTime(),
      })),
      sortKey: `${employee.firstName} ${employee.lastName}`,
    };
  });

  const { assignments, gaps } = buildSchedule(slots, candidates);

  if (assignments.length > 0) {
    await prisma.shift.createMany({
      data: assignments.map(({ employeeId, slot }) => ({
        employeeId,
        start: slot.start,
        end: slot.end,
        position: slot.positionName,
        positionId: slot.positionId,
        createdById: manager.id,
      })),
    });

    revalidatePath("/urnik");
    revalidatePath("/");
  }

  const missing = gaps.reduce((total, gap) => total + gap.missing, 0);
  const examples = gaps
    .slice(0, 3)
    .map(
      (gap) =>
        `${gap.slot.positionName} ${gap.slot.start.getDate()}. ${
          gap.slot.start.getMonth() + 1
        }.`,
    )
    .join(", ");
  const gapText = `Nepokritih mest: ${missing} (${examples}${
    gaps.length > 3 ? " …" : ""
  }).`;

  // Prazen rezultat pomeni, da so mesta že zasedena ali da ni ustreznih
  // kandidatov — ne, da je kaj narobe z nastavitvami.
  if (assignments.length === 0) {
    return {
      ok:
        gaps.length === 0
          ? "Vsa mesta iz predlog so že pokrita — nič novega ni bilo treba dodati."
          : `Nič novega ni bilo mogoče razporediti. ${gapText}`,
    };
  }

  const created = plural(assignments.length, [
    "izmena",
    "izmeni",
    "izmene",
    "izmen",
  ]);

  return {
    ok:
      gaps.length === 0
        ? `Sestavljeno: ${created}. Vsa mesta so pokrita.`
        : `Sestavljeno: ${created}. ${gapText}`,
  };
}
