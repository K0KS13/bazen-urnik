import { MonthPicker } from "@/components/month-picker";
import { formatEuro } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager } from "@/lib/session";
import {
  decimalHours,
  formatMinutes,
  monthName,
  monthRange,
  workedMinutes,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ leto?: string; mesec?: string }>;
}) {
  await requireScheduleManager();
  const params = await searchParams;

  const now = new Date();
  const year = Number(params.leto) || now.getFullYear();
  const month = Number(params.mesec) || now.getMonth() + 1;
  const { from, to } = monthRange(year, month);

  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      active: true,
      hourlyRate: true,
      timeEntries: {
        where: { clockIn: { gte: from, lt: to }, clockOut: { not: null } },
        select: { clockIn: true, clockOut: true, breakMinutes: true },
      },
    },
  });

  const rows = employees
    .map((employee) => {
      const minutes = employee.timeEntries.reduce(
        (total, entry) => total + workedMinutes(entry),
        0,
      );
      return {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        active: employee.active,
        shifts: employee.timeEntries.length,
        minutes,
        cost: employee.hourlyRate ? (minutes / 60) * employee.hourlyRate : null,
      };
    })
    .filter((row) => row.minutes > 0 || row.active);

  const totalMinutes = rows.reduce((total, row) => total + row.minutes, 0);
  const totalCost = rows.reduce((total, row) => total + (row.cost ?? 0), 0);

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
            Ocenjen bruto strošek: {formatEuro(totalCost)}
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
              <th className="pb-2 text-right font-medium">Ure</th>
              <th className="pb-2 text-right font-medium">Decimalno</th>
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
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatMinutes(row.minutes)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {decimalHours(row.minutes)}
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
