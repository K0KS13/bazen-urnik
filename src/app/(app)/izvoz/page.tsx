import { MonthPicker } from "@/components/month-picker";
import { formatEuro } from "@/lib/format";
import { grossPay } from "@/lib/pay";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager } from "@/lib/session";
import {
  decimalHours,
  formatMinutes,
  monthName,
  monthRange,
  workedMinutes,
  zonedParts,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ leto?: string; mesec?: string }>;
}) {
  await requireScheduleManager();
  const params = await searchParams;

  const now = zonedParts(new Date());
  const year = Number(params.leto) || now.year;
  const month = Number(params.mesec) || now.month;
  const { from, to } = monthRange(year, month);

  const [employees, payRules] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        active: true,
        hourlyRate: true,
        timeEntries: {
          where: { clockIn: { gte: from, lt: to }, clockOut: { not: null } },
          select: {
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
            penaltyMinutes: true,
          },
        },
      },
    }),
    prisma.payRule.findMany(),
  ]);

  const rows = employees
    .map((employee) => {
      let minutes = 0;
      let penalty = 0;
      let cost: number | null = employee.hourlyRate === null ? null : 0;

      for (const entry of employee.timeEntries) {
        const entryMinutes = workedMinutes(entry);
        minutes += entryMinutes;
        penalty += entry.penaltyMinutes;

        // Dodatek se določi po dnevu, ko se je izmena začela.
        const pay = grossPay(
          entry.clockIn,
          entryMinutes,
          employee.hourlyRate,
          payRules,
        );
        if (cost !== null && pay !== null) cost += pay;
      }

      return {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        active: employee.active,
        shifts: employee.timeEntries.length,
        minutes,
        penalty,
        cost,
      };
    })
    .filter((row) => row.minutes > 0 || row.active);

  const totalMinutes = rows.reduce((total, row) => total + row.minutes, 0);
  const totalCost = rows.reduce((total, row) => total + (row.cost ?? 0), 0);
  const totalPenalty = rows.reduce((total, row) => total + row.penalty, 0);

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker basePath="/izvoz" year={year} month={month} employees={[]} selectedEmployeeId="" />

      <section className="card">
        <p className="text-sm text-muted">
          {monthName(month)} {year} — skupaj
        </p>
        <p className="text-3xl font-bold tabular-nums">
          {formatMinutes(totalMinutes)}{" "}
          <span className="text-base font-normal text-muted">ur</span>
        </p>
        {totalCost > 0 ? (
          <p className="mt-1 text-sm text-muted">
            Ocenjen bruto strošek (z dodatki): {formatEuro(totalCost)}
          </p>
        ) : null}
        {totalPenalty > 0 ? (
          <p className="mt-1 text-sm text-warning">
            Odbito za zamude: {formatMinutes(totalPenalty)} h
          </p>
        ) : null}
      </section>

      <a
        href={`/api/izvoz?leto=${year}&mesec=${month}`}
        className="btn-primary"
        download
      >
        Prenesi CSV za obračun
      </a>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="pb-2 font-medium">Zaposlen/a</th>
              <th className="pb-2 text-right font-medium">Izmen</th>
              <th className="pb-2 text-right font-medium">Odbitek</th>
              <th className="pb-2 text-right font-medium">Ure</th>
              <th className="pb-2 text-right font-medium">Decimalno</th>
              <th className="pb-2 text-right font-medium">Bruto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 last:border-0">
                <td className="py-2">
                  {row.name}
                  {row.active ? "" : " (neaktiven/na)"}
                </td>
                <td className="py-2 text-right tabular-nums">{row.shifts}</td>
                <td className="py-2 text-right font-mono tabular-nums text-warning">
                  {row.penalty > 0 ? formatMinutes(row.penalty) : "—"}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatMinutes(row.minutes)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {decimalHours(row.minutes)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {row.cost === null ? "—" : formatEuro(row.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted">
        Izmene, ki še tečejo (brez odjave), niso vštete. Preveri jih v zavihku
        »Moje ure«, kjer jih lahko vodja ročno zaključi.
      </p>
    </div>
  );
}
