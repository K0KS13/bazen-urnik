import { ActionForm } from "@/components/action-form";
import { Collapsible } from "@/components/collapsible";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  resetPinAction,
  saveSkillsAction,
  updateEmployeeAction,
} from "@/lib/actions/employees";
import { formatEuro, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireAdmin();

  const [employees, positions] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        hourlyRate: true,
        weeklyHoursTarget: true,
        updatedAt: true,
        skills: { select: { positionId: true, level: true } },
        _count: { select: { timeEntries: true } },
      },
    }),
    prisma.position.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Collapsible summary="Dodaj zaposlenega" defaultOpen={employees.length <= 1}>
        <ActionForm action={createEmployeeAction} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="firstName">
                Ime
              </label>
              <input id="firstName" name="firstName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Priimek
              </label>
              <input id="lastName" name="lastName" className="field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="role">
                Vloga
              </label>
              <select id="role" name="role" className="field" defaultValue="employee">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pin">
                Začetni PIN
              </label>
              <input
                id="pin"
                name="pin"
                inputMode="numeric"
                maxLength={4}
                className="field"
                placeholder="4 števke"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="hourlyRate">
              Bruto urna postavka v € (neobvezno)
            </label>
            <input
              id="hourlyRate"
              name="hourlyRate"
              inputMode="decimal"
              className="field"
              placeholder="npr. 8,50"
            />
          </div>

          <button type="submit" className="btn-primary">
            Dodaj
          </button>
        </ActionForm>
      </Collapsible>

      <ul className="flex flex-col gap-2">
        {employees.map((employee) => (
          <li key={employee.id} className="card">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                {employee.firstName} {employee.lastName}
              </span>
              <span className="text-xs text-muted">
                {ROLE_LABELS[employee.role as keyof typeof ROLE_LABELS] ??
                  employee.role}
                {employee.active ? "" : " · neaktiven/na"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {plural(employee._count.timeEntries, [
                "vnos ur",
                "vnosa ur",
                "vnosi ur",
                "vnosov ur",
              ])}
              {employee.hourlyRate
                ? ` · ${formatEuro(employee.hourlyRate)}/h`
                : ""}
            </p>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted">Uredi</summary>

              <ActionForm
                resetKey={employee.updatedAt.toISOString()}
                action={updateEmployeeAction}
                className="mt-2 flex flex-col gap-3"
              >
                <input type="hidden" name="id" value={employee.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Vloga</label>
                    <select name="role" className="field" defaultValue={employee.role}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Urna postavka (€)</label>
                    <input
                      name="hourlyRate"
                      inputMode="decimal"
                      className="field"
                      defaultValue={
                        employee.hourlyRate
                          ? String(employee.hourlyRate).replace(".", ",")
                          : ""
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Cilj ur na teden (neobvezno)</label>
                  <input
                    name="weeklyHoursTarget"
                    inputMode="decimal"
                    className="field"
                    placeholder="npr. 20"
                    defaultValue={
                      employee.weeklyHoursTarget === null
                        ? ""
                        : String(employee.weeklyHoursTarget).replace(".", ",")
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={employee.active}
                    className="h-5 w-5 accent-teal-400"
                  />
                  Aktiven/na (se lahko prijavi in dobi izmene)
                </label>
                <button type="submit" className="btn-primary">
                  Shrani
                </button>
              </ActionForm>

              {positions.length > 0 ? (
                <ActionForm
                  resetKey={employee.skills
                    .map((skill) => `${skill.positionId}:${skill.level}`)
                    .sort()
                    .join("|")}
                  action={saveSkillsAction}
                  className="mt-3 flex flex-col gap-2"
                >
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <p className="label">
                    Ocene po delovnih mestih (0 = tega ne dela, 5 = povsem
                    samostojen)
                  </p>
                  {positions.map((position) => {
                    const level =
                      employee.skills.find(
                        (skill) => skill.positionId === position.id,
                      )?.level ?? 0;
                    return (
                      <div
                        key={position.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm">{position.name}</span>
                        <select
                          name={`level-${position.id}`}
                          defaultValue={level}
                          className="field w-24 py-1.5 text-sm"
                        >
                          {[0, 1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  <button type="submit" className="btn-secondary">
                    Shrani ocene
                  </button>
                </ActionForm>
              ) : null}

              <ActionForm action={resetPinAction} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="id" value={employee.id} />
                <div className="flex-1">
                  <label className="label">Nov PIN</label>
                  <input
                    name="pin"
                    inputMode="numeric"
                    maxLength={4}
                    className="field"
                    placeholder="4 števke"
                  />
                </div>
                <button type="submit" className="btn-secondary">
                  Ponastavi
                </button>
              </ActionForm>

              {employee._count.timeEntries === 0 ? (
                <ActionForm
                  action={deleteEmployeeAction}
                  className="mt-3"
                  confirm={`Res izbrišem ${employee.firstName} ${employee.lastName}?`}
                >
                  <input type="hidden" name="id" value={employee.id} />
                  <button type="submit" className="btn-danger w-full text-sm">
                    Izbriši
                  </button>
                </ActionForm>
              ) : null}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
