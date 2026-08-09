import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ElapsedSince, LiveClock } from "@/components/live-clock";
import { changeOwnPinAction } from "@/lib/actions/employees";
import { clockInAction, clockOutAction } from "@/lib/actions/time";
import { absencesToDecideBy, offersToDecideBy } from "@/lib/approvals";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import {
  addDays,
  formatDate,
  formatDateTime,
  formatMinutes,
  formatTime,
  monthRange,
  workedMinutes,
} from "@/lib/time";

export const dynamic = "force-dynamic";

/** Po tolikšnem času odprt vnos skoraj zagotovo pomeni pozabljeno odjavo. */
const STALE_ENTRY_HOURS = 14;

export default async function ClockPage() {
  const user = await requireUser();
  const manages = canManageSchedule(user.role);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = addDays(todayStart, 1);
  const { from, to } = monthRange(now.getFullYear(), now.getMonth() + 1);

  const [
    openEntry,
    upcomingShifts,
    monthEntries,
    todayShifts,
    onDuty,
    staleEntries,
    pendingAbsences,
    claimedOffers,
  ] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { employeeId: user.id, clockOut: null },
      orderBy: { clockIn: "desc" },
    }),
    prisma.shift.findMany({
      where: { employeeId: user.id, end: { gte: now } },
      orderBy: { start: "asc" },
      take: 4,
    }),
    prisma.timeEntry.findMany({
      where: {
        employeeId: user.id,
        clockIn: { gte: from, lt: to },
        clockOut: { not: null },
      },
      select: { clockIn: true, clockOut: true, breakMinutes: true },
    }),
    prisma.shift.findMany({
      where: { start: { gte: todayStart, lt: todayEnd } },
      orderBy: { start: "asc" },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { clockOut: null },
      orderBy: { clockIn: "asc" },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    manages
      ? prisma.timeEntry.findMany({
          where: {
            clockOut: null,
            clockIn: { lt: new Date(now.getTime() - STALE_ENTRY_HOURS * 3600000) },
          },
          include: { employee: { select: { firstName: true, lastName: true } } },
        })
      : Promise.resolve([]),
    manages
      ? prisma.absence.count({
          where: { status: "pending", ...absencesToDecideBy(user.id, user.role) },
        })
      : Promise.resolve(0),
    manages
      ? prisma.shiftOffer.count({
          where: { status: "claimed", ...offersToDecideBy(user.id, user.role) },
        })
      : Promise.resolve(0),
  ]);

  const monthMinutes = monthEntries.reduce(
    (total, entry) => total + workedMinutes(entry),
    0,
  );

  const hasTodo =
    staleEntries.length > 0 || pendingAbsences > 0 || claimedOffers > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="card text-center">
        <p className="text-sm text-muted">{formatDate(now)}</p>
        <LiveClock />
      </section>

      {openEntry ? (
        <section className="card border-accent/50">
          <p className="text-sm text-muted">Na izmeni od</p>
          <p className="text-2xl font-bold">
            {formatTime(openEntry.clockIn)}{" "}
            <span className="text-base font-normal text-muted">
              (<ElapsedSince start={openEntry.clockIn.toISOString()} /> h)
            </span>
          </p>

          <ActionForm action={clockOutAction} className="mt-4 flex flex-col gap-3">
            <div>
              <label className="label" htmlFor="breakMinutes">
                Odmor (minute)
              </label>
              <input
                id="breakMinutes"
                name="breakMinutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={480}
                step={5}
                defaultValue={0}
                className="field"
              />
            </div>
            <button type="submit" className="btn-danger py-4 text-lg">
              Odjava z izmene
            </button>
          </ActionForm>
        </section>
      ) : (
        <ActionForm action={clockInAction} className="card">
          <button type="submit" className="btn-primary w-full py-6 text-xl">
            Prijava na izmeno
          </button>
        </ActionForm>
      )}

      {manages && hasTodo ? (
        <section className="card border-warning/50">
          <h2 className="mb-2 font-semibold text-warning">Za urediti</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {staleEntries.map((entry) => (
              <li key={entry.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <Link href="/ure" className="block">
                  <span className="font-medium">
                    {entry.employee.firstName} {entry.employee.lastName}
                  </span>{" "}
                  se ni odjavil/a — prijava {formatDateTime(entry.clockIn)}
                </Link>
              </li>
            ))}
            {pendingAbsences > 0 ? (
              <li className="rounded-xl bg-surface-2 px-3 py-2">
                <Link href="/odsotnosti" className="block">
                  {plural(pendingAbsences, [
                    "vloga za odsotnost čaka",
                    "vlogi za odsotnost čakata",
                    "vloge za odsotnost čakajo",
                    "vlog za odsotnost čaka",
                  ])}{" "}
                  odločitev
                </Link>
              </li>
            ) : null}
            {claimedOffers > 0 ? (
              <li className="rounded-xl bg-surface-2 px-3 py-2">
                <Link href="/menjave" className="block">
                  {plural(claimedOffers, [
                    "menjava izmene čaka",
                    "menjavi izmen čakata",
                    "menjave izmen čakajo",
                    "menjav izmen čaka",
                  ])}{" "}
                  potrditev
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h2 className="mb-3 font-semibold">Danes v lokalu</h2>

        {onDuty.length > 0 ? (
          <div className="mb-3">
            <p className="label">Trenutno na izmeni</p>
            <ul className="flex flex-wrap gap-1.5">
              {onDuty.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
                >
                  {entry.employee.firstName} {entry.employee.lastName} · od{" "}
                  {formatTime(entry.clockIn)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="label">Razpored za danes</p>
        {todayShifts.length === 0 ? (
          <p className="text-sm text-muted">Za danes ni vpisanih izmen.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {todayShifts.map((shift) => (
              <li
                key={shift.id}
                className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {shift.employee.firstName} {shift.employee.lastName}
                </span>
                {shift.position ? (
                  <span className="shrink-0 text-xs text-muted">
                    {shift.position}
                  </span>
                ) : null}
                <span className="shrink-0 font-mono tabular-nums">
                  {formatTime(shift.start)}–{formatTime(shift.end)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Moje naslednje izmene</h2>
        {upcomingShifts.length === 0 ? (
          <p className="text-sm text-muted">Ni vpisanih prihodnjih izmen.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingShifts.map((shift) => (
              <li
                key={shift.id}
                className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
              >
                <span className="text-sm">{formatDate(shift.start)}</span>
                <span className="font-mono text-sm tabular-nums">
                  {formatTime(shift.start)}–{formatTime(shift.end)}
                </span>
                <span className="text-xs text-muted">{shift.position ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Ta mesec</h2>
        <p className="text-3xl font-bold tabular-nums">
          {formatMinutes(monthMinutes)}{" "}
          <span className="text-base font-normal text-muted">ur</span>
        </p>
        {openEntry ? (
          <p className="mt-1 text-xs text-muted">
            Brez izmene, ki je v teku (od {formatDateTime(openEntry.clockIn)}).
          </p>
        ) : null}
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Spremeni svoj PIN</summary>
        <ActionForm action={changeOwnPinAction} className="mt-3 flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="currentPin">
              Trenutni PIN
            </label>
            <input
              id="currentPin"
              name="currentPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="newPin">
              Nov PIN
            </label>
            <input
              id="newPin"
              name="newPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              className="field"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Shrani nov PIN
          </button>
        </ActionForm>
      </details>
    </div>
  );
}
