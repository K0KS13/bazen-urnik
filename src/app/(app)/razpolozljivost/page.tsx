import { ActionForm } from "@/components/action-form";
import { saveAvailabilityAction } from "@/lib/actions/availability";
import {
  AVAILABILITY_CLASS,
  AVAILABILITY_LABELS,
  AVAILABILITY_SHORT,
  AVAILABILITY_STATUSES,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  WEEKDAYS,
  type AvailabilityStatus,
} from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function statusOf(value: string): AvailabilityStatus {
  return AVAILABILITY_STATUSES.includes(value as AvailabilityStatus)
    ? (value as AvailabilityStatus)
    : "yes";
}

export default async function AvailabilityPage() {
  const user = await requireUser();
  const manages = canManageSchedule(user.role);

  const [mine, team] = await Promise.all([
    prisma.availability.findMany({ where: { employeeId: user.id } }),
    manages
      ? prisma.employee.findMany({
          where: { active: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            availability: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const byWeekday = new Map(mine.map((row) => [row.weekday, row]));

  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <h2 className="font-semibold">Moja razpoložljivost</h2>
        <p className="mt-1 text-sm text-muted">
          Okvir za vodjo pri sestavljanju urnika. Za posamezen dan, ko te ne bo,
          oddaj raje vlogo pod <span className="text-foreground">Odsotnosti</span>.
        </p>

        <ActionForm
          resetKey={mine
            .map((row) => `${row.weekday}:${row.status}:${row.fromTime}:${row.toTime}`)
            .sort()
            .join("|")}
          action={saveAvailabilityAction}
          className="mt-3 flex flex-col gap-3"
        >
          {WEEKDAYS.map((weekday) => {
            const row = byWeekday.get(weekday);
            const current = statusOf(row?.status ?? "yes");

            return (
              <div key={weekday} className="rounded-xl bg-surface-2 p-3">
                <p className="mb-2 font-medium">{WEEKDAY_LABELS[weekday]}</p>

                <div className="flex gap-1.5">
                  {AVAILABILITY_STATUSES.map((status) => (
                    <label
                      key={status}
                      className="flex-1 cursor-pointer text-center text-xs"
                    >
                      <input
                        type="radio"
                        name={`status-${weekday}`}
                        value={status}
                        defaultChecked={current === status}
                        className="peer sr-only"
                      />
                      <span className="block rounded-lg border border-border px-2 py-2 font-semibold text-muted peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-accent">
                        {AVAILABILITY_LABELS[status]}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">Od</span>
                  <input
                    type="time"
                    name={`from-${weekday}`}
                    defaultValue={row?.fromTime ?? ""}
                    className="field flex-1 py-1.5 text-sm"
                  />
                  <span className="text-xs text-muted">do</span>
                  <input
                    type="time"
                    name={`to-${weekday}`}
                    defaultValue={row?.toTime ?? ""}
                    className="field flex-1 py-1.5 text-sm"
                  />
                </div>
              </div>
            );
          })}

          <button type="submit" className="btn-primary">
            Shrani razpoložljivost
          </button>
        </ActionForm>
      </section>

      {manages ? (
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-semibold">Razpoložljivost ekipe</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-medium">Zaposlen/a</th>
                {WEEKDAYS.map((weekday) => (
                  <th key={weekday} className="pb-2 text-center font-medium">
                    {WEEKDAY_SHORT[weekday]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((employee) => {
                const rows = new Map(
                  employee.availability.map((row) => [row.weekday, row]),
                );
                return (
                  <tr key={employee.id} className="border-t border-border/50">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {employee.firstName} {employee.lastName}
                    </td>
                    {WEEKDAYS.map((weekday) => {
                      const row = rows.get(weekday);
                      const status = statusOf(row?.status ?? "yes");
                      return (
                        <td key={weekday} className="py-2 text-center">
                          <span
                            title={
                              row?.fromTime && row?.toTime
                                ? `${row.fromTime}–${row.toTime}`
                                : AVAILABILITY_LABELS[status]
                            }
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${AVAILABILITY_CLASS[status]}`}
                          >
                            {AVAILABILITY_SHORT[status]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            Kdor razpoložljivosti še ni oddal, je prikazan kot »lahko delam«.
          </p>
        </section>
      ) : null}
    </div>
  );
}
