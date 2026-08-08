import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { createShiftAction, deleteShiftAction } from "@/lib/actions/shifts";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
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

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ teden?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canManage = canManageSchedule(user.role);

  const requested = params.teden ? new Date(`${params.teden}T00:00:00`) : new Date();
  const weekStart = startOfWeek(
    Number.isNaN(requested.getTime()) ? new Date() : requested,
  );
  const weekEnd = addDays(weekStart, 7);
  const days = weekDays(weekStart);

  const [shifts, employees] = await Promise.all([
    prisma.shift.findMany({
      where: { start: { gte: weekStart, lt: weekEnd } },
      orderBy: { start: "asc" },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    canManage
      ? prisma.employee.findMany({
          where: { active: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  // Za zaposlene brez pravic prikažemo samo njihove izmene.
  const visibleShifts = canManage
    ? shifts
    : shifts.filter((shift) => shift.employeeId === user.id);

  const shiftsByDay = days.map((day) => {
    const dayEnd = addDays(day, 1);
    return visibleShifts.filter(
      (shift) => shift.start >= day && shift.start < dayEnd,
    );
  });

  const previousWeek = toLocalDateValue(addDays(weekStart, -7));
  const nextWeek = toLocalDateValue(addDays(weekStart, 7));

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center justify-between gap-2">
        <Link href={`/urnik?teden=${previousWeek}`} className="btn-secondary px-3 py-2 text-sm">
          ← Prejšnji
        </Link>
        <p className="text-center text-sm font-semibold">
          {toLocalDateValue(weekStart).split("-").reverse().join(". ")} –{" "}
          {toLocalDateValue(addDays(weekStart, 6)).split("-").reverse().join(". ")}
        </p>
        <Link href={`/urnik?teden=${nextWeek}`} className="btn-secondary px-3 py-2 text-sm">
          Naslednji →
        </Link>
      </nav>

      <div className="flex flex-col gap-2">
        {days.map((day, index) => (
          <section key={day.toISOString()} className="card">
            <h2 className="mb-2 flex items-baseline justify-between">
              <span className="font-semibold">{DAY_LABELS[index]}</span>
              <span className="text-sm text-muted">
                {day.getDate()}. {day.getMonth() + 1}.
              </span>
            </h2>

            {shiftsByDay[index].length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {shiftsByDay[index].map((shift) => (
                  <li
                    key={shift.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                      shift.employeeId === user.id
                        ? "bg-accent/15 ring-1 ring-accent/40"
                        : "bg-surface-2"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {shift.employee.firstName} {shift.employee.lastName}
                      </p>
                      {shift.position || shift.note ? (
                        <p className="truncate text-xs text-muted">
                          {[shift.position, shift.note].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-sm tabular-nums">
                      {formatTime(shift.start)}–{formatTime(shift.end)}
                    </span>
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {canManage ? (
        <details className="card" open={visibleShifts.length === 0}>
          <summary className="cursor-pointer font-semibold">Dodaj izmeno</summary>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="startTime">
                  Začetek
                </label>
                <input
                  id="startTime"
                  name="startTime"
                  type="time"
                  className="field"
                  defaultValue="16:00"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="endTime">
                  Konec
                </label>
                <input
                  id="endTime"
                  name="endTime"
                  type="time"
                  className="field"
                  defaultValue="23:00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="position">
                Delovno mesto (neobvezno)
              </label>
              <input
                id="position"
                name="position"
                className="field"
                placeholder="šank, kuhinja, strežba, bazen …"
              />
            </div>

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
        </details>
      ) : null}
    </div>
  );
}
