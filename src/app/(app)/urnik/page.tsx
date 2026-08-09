import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Collapsible } from "@/components/collapsible";
import { PartOfDayTimes } from "@/components/part-of-day-times";
import { offerShiftAction } from "@/lib/actions/offers";
import { generateWeekAction } from "@/lib/actions/scheduler";
import {
  copyPreviousWeekAction,
  createShiftAction,
  deleteShiftAction,
} from "@/lib/actions/shifts";
import {
  defaultTimes,
  PART_CLASS,
  PART_LABELS,
  PARTS_OF_DAY,
  partOfShift,
  type PartOfDay,
} from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { ABSENCE_TYPE_LABELS, type AbsenceType } from "@/lib/requests";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import {
  addDays,
  formatTime,
  startOfWeek,
  toLocalDateValue,
  weekDays,
} from "@/lib/time";

export const dynamic = "force-dynamic";

const DAY_LABELS = [
  "Ponedeljek",
  "Torek",
  "Sreda",
  "Četrtek",
  "Petek",
  "Sobota",
  "Nedelja",
];

/** "2026-08-03" -> "3. 8. 2026" */
function humanDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${Number(day)}. ${Number(month)}. ${year}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ teden?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canManage = canManageSchedule(user.role);
  const now = new Date();

  const requested = params.teden ? new Date(`${params.teden}T00:00:00`) : new Date();
  const weekStart = startOfWeek(
    Number.isNaN(requested.getTime()) ? new Date() : requested,
  );
  const weekEnd = addDays(weekStart, 7);
  const days = weekDays(weekStart);

  const [shifts, absences, employees, positions, settings] = await Promise.all([
    prisma.shift.findMany({
      where: { start: { gte: weekStart, lt: weekEnd } },
      orderBy: { start: "asc" },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        offer: { select: { id: true, status: true } },
      },
    }),
    prisma.absence.findMany({
      where: {
        status: "approved",
        startDate: { lt: weekEnd },
        endDate: { gte: weekStart },
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    canManage
      ? prisma.employee.findMany({
          where: { active: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.position.findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
    getSettings(),
  ]);

  // Zaposleni brez pravic vidi razpored celotne ekipe, odsotnosti pa le svoje —
  // razlog odsotnosti sodelavca ga ne zadeva.
  const visibleAbsences = canManage
    ? absences
    : absences.filter((absence) => absence.employeeId === user.id);

  const previousWeek = toLocalDateValue(addDays(weekStart, -7));
  const nextWeek = toLocalDateValue(addDays(weekStart, 7));

  const partDefaults = Object.fromEntries(
    PARTS_OF_DAY.map((part) => [part, defaultTimes(part, settings)]),
  ) as Record<PartOfDay, { start: string; end: string }>;

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center justify-between gap-2">
        <Link
          href={`/urnik?teden=${previousWeek}`}
          className="btn-secondary px-3 py-2 text-sm"
        >
          ← Prejšnji
        </Link>
        <p className="text-center text-sm font-semibold">
          {humanDate(toLocalDateValue(weekStart))} –{" "}
          {humanDate(toLocalDateValue(addDays(weekStart, 6)))}
        </p>
        <Link
          href={`/urnik?teden=${nextWeek}`}
          className="btn-secondary px-3 py-2 text-sm"
        >
          Naslednji →
        </Link>
      </nav>

      <div className="flex flex-col gap-2">
        {days.map((day, index) => {
          const dayEnd = addDays(day, 1);
          const dayShifts = shifts.filter(
            (shift) => shift.start >= day && shift.start < dayEnd,
          );
          const dayAbsences = visibleAbsences.filter(
            (absence) => absence.startDate < dayEnd && absence.endDate >= day,
          );
          const isToday = day.toDateString() === now.toDateString();

          return (
            <section
              key={day.toISOString()}
              className={`card ${isToday ? "border-accent/60" : ""}`}
            >
              <h2 className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold">
                  {DAY_LABELS[index]}
                  {isToday ? (
                    <span className="ml-2 text-xs font-normal text-accent">danes</span>
                  ) : null}
                </span>
                <span className="text-sm text-muted">
                  {day.getDate()}. {day.getMonth() + 1}.
                </span>
              </h2>

              {dayShifts.length === 0 && dayAbsences.length === 0 ? (
                <p className="text-sm text-muted">—</p>
              ) : null}

              {PARTS_OF_DAY.map((part) => {
                const partShifts = dayShifts.filter(
                  (shift) => partOfShift(shift) === part,
                );
                if (partShifts.length === 0) return null;

                return (
                  <div key={part} className="mb-3 last:mb-0">
                    <p
                      className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${PART_CLASS[part]}`}
                    >
                      {PART_LABELS[part]}
                    </p>

                    <ul className="flex flex-col gap-1.5">
                      {partShifts.map((shift) => {
                        const isMine = shift.employeeId === user.id;
                        const offerActive =
                          shift.offer?.status === "open" ||
                          shift.offer?.status === "claimed";

                        return (
                          <li
                            key={shift.id}
                            className={`rounded-xl px-3 py-2 ${
                              isMine
                                ? "bg-accent/15 ring-1 ring-accent/40"
                                : "bg-surface-2"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 font-mono text-sm tabular-nums">
                                {formatTime(shift.start)}–{formatTime(shift.end)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {shift.employee.firstName} {shift.employee.lastName}
                              </span>
                              {shift.position ? (
                                <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted">
                                  {shift.position}
                                </span>
                              ) : null}
                              {canManage ? (
                                <ActionForm
                                  action={deleteShiftAction}
                                  confirm="Izbrišem to izmeno?"
                                >
                                  <input type="hidden" name="id" value={shift.id} />
                                  <button
                                    type="submit"
                                    aria-label="Izbriši izmeno"
                                    className="btn-danger px-2 py-1 text-xs"
                                  >
                                    ✕
                                  </button>
                                </ActionForm>
                              ) : null}
                            </div>

                            {shift.note ? (
                              <p className="mt-1 text-xs text-muted">{shift.note}</p>
                            ) : null}

                            {offerActive ? (
                              <Link
                                href="/menjave"
                                className="mt-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning"
                              >
                                {shift.offer?.status === "open"
                                  ? "Oddana — prosta za prevzem"
                                  : "Prevzeta, čaka potrditev"}
                              </Link>
                            ) : null}

                            {isMine && !offerActive && shift.start > now ? (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted">
                                  Ne morem — oddaj izmeno
                                </summary>
                                <ActionForm
                                  action={offerShiftAction}
                                  className="mt-2 flex gap-2"
                                >
                                  <input
                                    type="hidden"
                                    name="shiftId"
                                    value={shift.id}
                                  />
                                  <input
                                    name="note"
                                    className="field flex-1 text-sm"
                                    placeholder="Sporočilo (neobvezno)"
                                  />
                                  <button
                                    type="submit"
                                    className="btn-secondary text-sm"
                                  >
                                    Oddaj
                                  </button>
                                </ActionForm>
                              </details>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {dayAbsences.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {dayAbsences.map((absence) => (
                    <li
                      key={absence.id}
                      className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger"
                    >
                      {absence.employee.firstName} {absence.employee.lastName} —{" "}
                      {ABSENCE_TYPE_LABELS[absence.type as AbsenceType] ?? absence.type}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {canManage ? (
        <>
          <ActionForm
            action={generateWeekAction}
            className="card"
            confirm="Sestavim urnik za ta teden iz predlog? Obstoječe izmene ostanejo."
          >
            <input
              type="hidden"
              name="weekStart"
              value={toLocalDateValue(weekStart)}
            />
            <button type="submit" className="btn-primary w-full">
              Sestavi urnik iz predlog
            </button>
            <p className="mt-2 text-xs text-muted">
              Upošteva razpoložljivost, odsotnosti, ocene po delovnih mestih in
              cilje ur. Obstoječih izmen ne spreminja.
            </p>
          </ActionForm>

          <ActionForm
            action={copyPreviousWeekAction}
            className="card"
            confirm="Prepišem izmene prejšnjega tedna na ta teden?"
          >
            <input
              type="hidden"
              name="weekStart"
              value={toLocalDateValue(weekStart)}
            />
            <button type="submit" className="btn-secondary w-full">
              Kopiraj urnik prejšnjega tedna
            </button>
            <p className="mt-2 text-xs text-muted">
              Preskoči tiste z odobreno odsotnostjo in izmene, ki že obstajajo.
            </p>
          </ActionForm>

          <Collapsible summary="Dodaj izmeno" defaultOpen={shifts.length === 0}>
            <ActionForm action={createShiftAction} className="mt-3 flex flex-col gap-3">
              <div>
                <label className="label" htmlFor="employeeId">
                  Zaposlen/a
                </label>
                <select id="employeeId" name="employeeId" className="field" required>
                  <option value="">— izberi —</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="positionId">
                  Delovno mesto
                </label>
                {positions.length === 0 ? (
                  <p className="text-sm text-warning">
                    Delovnih mest še ni — dodaj jih v Nastavitve.
                  </p>
                ) : (
                  <select id="positionId" name="positionId" className="field">
                    <option value="">— brez —</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="label" htmlFor="date">
                  Datum
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  className="field"
                  defaultValue={toLocalDateValue(weekStart)}
                  required
                />
              </div>

              <PartOfDayTimes defaults={partDefaults} />

              <div>
                <label className="label" htmlFor="note">
                  Opomba (neobvezno)
                </label>
                <input id="note" name="note" className="field" />
              </div>

              <button type="submit" className="btn-primary">
                Dodaj izmeno
              </button>
            </ActionForm>
          </Collapsible>
        </>
      ) : null}
    </div>
  );
}
