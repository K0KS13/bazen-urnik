import { ActionForm } from "@/components/action-form";
import { ElapsedSince, LiveClock } from "@/components/live-clock";
import { changeOwnPinAction } from "@/lib/actions/employees";
import { clockInAction, clockOutAction } from "@/lib/actions/time";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  formatDate,
  formatDateTime,
  formatMinutes,
  formatTime,
  monthRange,
  workedMinutes,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const user = await requireUser();
  const now = new Date();
  const { from, to } = monthRange(now.getFullYear(), now.getMonth() + 1);

  const [openEntry, upcomingShifts, monthEntries] = await Promise.all([
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
  ]);

  const monthMinutes = monthEntries.reduce(
    (total, entry) => total + workedMinutes(entry),
    0,
  );

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

      <section className="card">
        <h2 className="mb-3 font-semibold">Naslednje izmene</h2>
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
