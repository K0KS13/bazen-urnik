import { ActionForm } from "@/components/action-form";
import { MonthPicker } from "@/components/month-picker";
import { deleteTimeEntryAction, updateTimeEntryAction } from "@/lib/actions/time";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import {
  formatDate,
  formatMinutes,
  formatTime,
  monthRange,
  toLocalInputValue,
  workedMinutes,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HoursPage({
  searchParams,
}: {
  searchParams: Promise<{ oseba?: string; leto?: string; mesec?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canManage = canManageSchedule(user.role);

  const now = new Date();
  const year = Number(params.leto) || now.getFullYear();
  const month = Number(params.mesec) || now.getMonth() + 1;
  const { from, to } = monthRange(year, month);

  // Zaposleni brez pravic vidi vedno le svoje ure, ne glede na parametre v URL-ju.
  const employeeId = canManage ? (params.oseba || user.id) : user.id;

  const [entries, employees] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { employeeId, clockIn: { gte: from, lt: to } },
      orderBy: { clockIn: "desc" },
      include: {
        editedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    canManage
      ? prisma.employee.findMany({
          orderBy: [{ active: "desc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true, active: true },
        })
      : Promise.resolve([]),
  ]);

  const totalMinutes = entries.reduce(
    (total, entry) => total + workedMinutes(entry),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker
        basePath="/ure"
        year={year}
        month={month}
        employees={employees}
        selectedEmployeeId={employeeId}
      />

      <section className="card">
        <p className="text-sm text-muted">Skupaj v izbranem mesecu</p>
        <p className="text-3xl font-bold tabular-nums">
          {formatMinutes(totalMinutes)}{" "}
          <span className="text-base font-normal text-muted">ur</span>
        </p>
      </section>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">V tem mesecu ni zabeleženih ur.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const minutes = workedMinutes(entry);
            return (
              <li key={entry.id} className="card">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{formatDate(entry.clockIn)}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatTime(entry.clockIn)}–
                    {entry.clockOut ? formatTime(entry.clockOut) : "…"}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {entry.clockOut ? formatMinutes(minutes) : "v teku"}
                  </span>
                </div>

                {entry.breakMinutes > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    Odmor: {entry.breakMinutes} min
                  </p>
                ) : null}
                {entry.note ? (
                  <p className="mt-1 text-xs text-muted">{entry.note}</p>
                ) : null}
                {entry.editedBy && entry.editedAt ? (
                  <p className="mt-1 text-xs text-warning">
                    Popravil/a {entry.editedBy.firstName} {entry.editedBy.lastName},{" "}
                    {formatDate(entry.editedAt)}
                  </p>
                ) : null}

                {canManage ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted">
                      Popravi
                    </summary>
                    <ActionForm
                      action={updateTimeEntryAction}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <input type="hidden" name="id" value={entry.id} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Prijava</label>
                          <input
                            name="clockIn"
                            type="datetime-local"
                            className="field"
                            defaultValue={toLocalInputValue(entry.clockIn)}
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Odjava</label>
                          <input
                            name="clockOut"
                            type="datetime-local"
                            className="field"
                            defaultValue={
                              entry.clockOut ? toLocalInputValue(entry.clockOut) : ""
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Odmor (min)</label>
                        <input
                          name="breakMinutes"
                          type="number"
                          min={0}
                          max={480}
                          step={5}
                          className="field"
                          defaultValue={entry.breakMinutes}
                        />
                      </div>
                      <div>
                        <label className="label">Opomba</label>
                        <input
                          name="note"
                          className="field"
                          defaultValue={entry.note ?? ""}
                          placeholder="npr. pozabljena odjava"
                        />
                      </div>
                      <button type="submit" className="btn-primary">
                        Shrani popravek
                      </button>
                    </ActionForm>

                    <ActionForm
                      action={deleteTimeEntryAction}
                      className="mt-2"
                      confirm="Res izbrišem ta vnos ur?"
                    >
                      <input type="hidden" name="id" value={entry.id} />
                      <button type="submit" className="btn-danger w-full text-sm">
                        Izbriši vnos
                      </button>
                    </ActionForm>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
