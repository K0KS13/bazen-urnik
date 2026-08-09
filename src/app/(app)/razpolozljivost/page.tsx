import { ActionForm } from "@/components/action-form";
import { AvailabilityGrid } from "@/components/availability-grid";
import { saveAvailabilityAction } from "@/lib/actions/availability";
import {
  AVAILABILITY_CLASS,
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  WEEKDAY_SHORT,
  WEEKDAYS,
  type AvailabilityStatus,
} from "@/lib/availability";
import { AVAILABILITY_PARTS, type AvailabilityPart } from "@/lib/parts-of-day";
import { prisma } from "@/lib/prisma";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PART_SHORT: Record<AvailabilityPart, string> = {
  dopoldan: "dop",
  popoldan: "pop",
};

const MARK: Record<AvailabilityStatus, string> = {
  yes: "✓",
  maybe: "?",
  no: "✕",
};

function statusOf(value: string | undefined): AvailabilityStatus {
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

  const initial = Object.fromEntries(
    mine.map((row) => [`${row.weekday}:${row.partOfDay}`, statusOf(row.status)]),
  );

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
            .map((row) => `${row.weekday}:${row.partOfDay}:${row.status}`)
            .sort()
            .join("|")}
          action={saveAvailabilityAction}
          className="mt-3 flex flex-col gap-3"
        >
          <AvailabilityGrid initial={initial} />
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
                  employee.availability.map((row) => [
                    `${row.weekday}:${row.partOfDay}`,
                    statusOf(row.status),
                  ]),
                );
                return (
                  <tr key={employee.id} className="border-t border-border/50">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {employee.firstName} {employee.lastName}
                    </td>
                    {WEEKDAYS.map((weekday) => (
                      <td key={weekday} className="px-0.5 py-2">
                        <div className="flex flex-col gap-0.5">
                          {AVAILABILITY_PARTS.map((part) => {
                            const status =
                              rows.get(`${weekday}:${part}`) ?? "yes";
                            return (
                              <span
                                key={part}
                                title={`${PART_SHORT[part]}: ${AVAILABILITY_LABELS[status]}`}
                                className={`rounded px-1 py-0.5 text-center text-[10px] font-semibold ${AVAILABILITY_CLASS[status]}`}
                              >
                                {PART_SHORT[part]} {MARK[status]}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            Zgornja vrstica je dopoldne, spodnja popoldne. Kdor razpoložljivosti
            še ni oddal, je prikazan kot »lahko delam«.
          </p>
        </section>
      ) : null}
    </div>
  );
}
