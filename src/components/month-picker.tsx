"use client";

import { useRouter } from "next/navigation";
import { monthName } from "@/lib/time";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

/** Izbira meseca (in za vodje tudi osebe); stanje se hrani v naslovu strani. */
export function MonthPicker({
  basePath,
  year,
  month,
  employees,
  selectedEmployeeId,
  employeeParam = "oseba",
  allowAllEmployees = false,
}: {
  basePath: string;
  year: number;
  month: number;
  employees: EmployeeOption[];
  selectedEmployeeId: string;
  employeeParam?: string;
  /** Če je true, ponudi tudi možnost »vsi zaposleni«. */
  allowAllEmployees?: boolean;
}) {
  const router = useRouter();
  const years = [year - 1, year, year + 1];

  function navigate(next: { year?: number; month?: number; employee?: string }) {
    const params = new URLSearchParams({
      leto: String(next.year ?? year),
      mesec: String(next.month ?? month),
    });
    const employee = next.employee ?? selectedEmployeeId;
    if (employee) params.set(employeeParam, employee);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="month">
            Mesec
          </label>
          <select
            id="month"
            className="field"
            value={month}
            onChange={(event) => navigate({ month: Number(event.target.value) })}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {monthName(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="year">
            Leto
          </label>
          <select
            id="year"
            className="field"
            value={year}
            onChange={(event) => navigate({ year: Number(event.target.value) })}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {employees.length > 0 ? (
        <div>
          <label className="label" htmlFor="employee">
            Zaposlen/a
          </label>
          <select
            id="employee"
            className="field"
            value={selectedEmployeeId}
            onChange={(event) => navigate({ employee: event.target.value })}
          >
            {allowAllEmployees ? <option value="vsi">Vsi zaposleni</option> : null}
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
                {employee.active ? "" : " (neaktiven/na)"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
