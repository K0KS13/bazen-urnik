import { ActionForm } from "@/components/action-form";
import { Collapsible } from "@/components/collapsible";
import {
  cancelAbsenceAction,
  decideAbsenceAction,
  requestAbsenceAction,
} from "@/lib/actions/absences";
import { absencesToDecideBy } from "@/lib/approvals";
import { prisma } from "@/lib/prisma";
import {
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  STATUS_LABELS,
  statusClass,
  type AbsenceType,
} from "@/lib/requests";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { plural } from "@/lib/format";
import { daysBetween, formatDate, toLocalDateValue } from "@/lib/time";

export const dynamic = "force-dynamic";

function typeLabel(type: string): string {
  return ABSENCE_TYPE_LABELS[type as AbsenceType] ?? type;
}

export default async function AbsencesPage() {
  const user = await requireUser();
  const manages = canManageSchedule(user.role);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [mine, pending, upcoming] = await Promise.all([
    prisma.absence.findMany({
      where: { employeeId: user.id },
      orderBy: { startDate: "desc" },
      take: 20,
      include: { decidedBy: { select: { firstName: true, lastName: true } } },
    }),
    manages
      ? prisma.absence.findMany({
          where: { status: "pending", ...absencesToDecideBy(user.id, user.role) },
          orderBy: { startDate: "asc" },
          include: { employee: { select: { firstName: true, lastName: true } } },
        })
      : Promise.resolve([]),
    manages
      ? prisma.absence.findMany({
          where: { status: "approved", endDate: { gte: today } },
          orderBy: { startDate: "asc" },
          include: { employee: { select: { firstName: true, lastName: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {manages && pending.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">
            Čaka tvojo odločitev ({pending.length})
          </h2>
          {pending.map((absence) => (
            <article key={absence.id} className="card border-warning/40">
              <p className="font-semibold">
                {absence.employee.firstName} {absence.employee.lastName}
              </p>
              <p className="text-sm text-muted">
                {typeLabel(absence.type)} · {formatDate(absence.startDate)} –{" "}
                {formatDate(absence.endDate)} (
                {plural(daysBetween(absence.startDate, absence.endDate), [
                  "dan",
                  "dneva",
                  "dnevi",
                  "dni",
                ])}
                )
              </p>
              {absence.reason ? (
                <p className="mt-1 text-sm">{absence.reason}</p>
              ) : null}

              <ActionForm action={decideAbsenceAction} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={absence.id} />
                <input
                  name="decisionNote"
                  className="field"
                  placeholder="Opomba (neobvezno)"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="btn-primary flex-1"
                  >
                    Odobri
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="btn-danger flex-1"
                  >
                    Zavrni
                  </button>
                </div>
              </ActionForm>
            </article>
          ))}
        </section>
      ) : null}

      <Collapsible summary="Oddaj vlogo" defaultOpen={mine.length === 0}>
        <ActionForm action={requestAbsenceAction} className="mt-3 flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="type">
              Vrsta
            </label>
            <select id="type" name="type" className="field" defaultValue="dopust">
              {ABSENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ABSENCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="startDate">
                Od
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                className="field"
                defaultValue={toLocalDateValue(today)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="endDate">
                Do (vključno)
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                className="field"
                defaultValue={toLocalDateValue(today)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="reason">
              Razlog (neobvezno)
            </label>
            <input id="reason" name="reason" className="field" />
          </div>

          <button type="submit" className="btn-primary">
            Oddaj vlogo
          </button>
        </ActionForm>
      </Collapsible>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Moje vloge</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Nimaš oddanih vlog.</p>
        ) : (
          mine.map((absence) => (
            <article key={absence.id} className="card">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{typeLabel(absence.type)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(
                    absence.status,
                  )}`}
                >
                  {STATUS_LABELS[absence.status] ?? absence.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatDate(absence.startDate)} – {formatDate(absence.endDate)} (
                {plural(daysBetween(absence.startDate, absence.endDate), [
                  "dan",
                  "dneva",
                  "dnevi",
                  "dni",
                ])}
                )
              </p>
              {absence.reason ? (
                <p className="mt-1 text-sm">{absence.reason}</p>
              ) : null}
              {absence.decisionNote ? (
                <p className="mt-1 text-sm text-warning">
                  Opomba vodje: {absence.decisionNote}
                </p>
              ) : null}
              {absence.decidedBy ? (
                <p className="mt-1 text-xs text-muted">
                  Odločil/a {absence.decidedBy.firstName} {absence.decidedBy.lastName}
                </p>
              ) : null}

              {absence.status === "pending" ? (
                <ActionForm
                  action={cancelAbsenceAction}
                  className="mt-2"
                  confirm="Umaknem to vlogo?"
                >
                  <input type="hidden" name="id" value={absence.id} />
                  <button type="submit" className="btn-secondary w-full text-sm">
                    Umakni vlogo
                  </button>
                </ActionForm>
              ) : null}
            </article>
          ))
        )}
      </section>

      {manages ? (
        <section className="card">
          <h2 className="mb-2 font-semibold">Odobrene odsotnosti, ki še pridejo</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nobene.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((absence) => (
                <li
                  key={absence.id}
                  className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {absence.employee.firstName} {absence.employee.lastName}
                  </span>
                  <span className="shrink-0 text-muted">
                    {typeLabel(absence.type)}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">
                    {formatDate(absence.startDate)} – {formatDate(absence.endDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
