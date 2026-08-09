import { ActionForm } from "@/components/action-form";
import {
  cancelOfferAction,
  claimOfferAction,
  decideOfferAction,
} from "@/lib/actions/offers";
import { offersToDecideBy } from "@/lib/approvals";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, statusClass } from "@/lib/requests";
import { canManageSchedule } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const offerInclude = {
  shift: { select: { start: true, end: true, position: true } },
  offeredBy: { select: { firstName: true, lastName: true } },
  claimedBy: { select: { firstName: true, lastName: true } },
} as const;

function ShiftLine({
  shift,
}: {
  shift: { start: Date; end: Date; position: string | null };
}) {
  return (
    <p className="font-mono text-sm tabular-nums">
      {formatDate(shift.start)} · {formatTime(shift.start)}–{formatTime(shift.end)}
      {shift.position ? (
        <span className="font-sans text-muted"> · {shift.position}</span>
      ) : null}
    </p>
  );
}

export default async function OffersPage() {
  const user = await requireUser();
  const manages = canManageSchedule(user.role);
  const now = new Date();

  const [open, mine, awaitingDecision] = await Promise.all([
    prisma.shiftOffer.findMany({
      where: {
        status: "open",
        offeredById: { not: user.id },
        shift: { start: { gte: now } },
      },
      orderBy: { shift: { start: "asc" } },
      include: offerInclude,
    }),
    prisma.shiftOffer.findMany({
      where: {
        OR: [{ offeredById: user.id }, { claimedById: user.id }],
        status: { in: ["open", "claimed", "approved", "rejected"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: offerInclude,
    }),
    manages
      ? prisma.shiftOffer.findMany({
          where: { status: "claimed", ...offersToDecideBy(user.id, user.role) },
          orderBy: { shift: { start: "asc" } },
          include: offerInclude,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {manages && awaitingDecision.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">
            Čaka tvojo potrditev ({awaitingDecision.length})
          </h2>
          {awaitingDecision.map((offer) => (
            <article key={offer.id} className="card border-warning/40">
              <ShiftLine shift={offer.shift} />
              <p className="mt-1 text-sm">
                <span className="text-muted">Oddal/a:</span>{" "}
                {offer.offeredBy.firstName} {offer.offeredBy.lastName}
              </p>
              <p className="text-sm">
                <span className="text-muted">Prevzel/a:</span>{" "}
                {offer.claimedBy?.firstName} {offer.claimedBy?.lastName}
              </p>
              {offer.note ? (
                <p className="mt-1 text-sm text-muted">{offer.note}</p>
              ) : null}

              <ActionForm action={decideOfferAction} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={offer.id} />
                <button
                  type="submit"
                  name="decision"
                  value="approved"
                  className="btn-primary flex-1"
                >
                  Potrdi menjavo
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="rejected"
                  className="btn-danger flex-1"
                >
                  Zavrni
                </button>
              </ActionForm>
            </article>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Proste izmene ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted">
            Trenutno ni ponujenih izmen. Svojo izmeno oddaš v zavihku Urnik.
          </p>
        ) : (
          open.map((offer) => (
            <article key={offer.id} className="card">
              <ShiftLine shift={offer.shift} />
              <p className="mt-1 text-sm text-muted">
                Oddal/a: {offer.offeredBy.firstName} {offer.offeredBy.lastName}
              </p>
              {offer.note ? <p className="mt-1 text-sm">{offer.note}</p> : null}

              <ActionForm action={claimOfferAction} className="mt-3">
                <input type="hidden" name="id" value={offer.id} />
                <button type="submit" className="btn-primary w-full">
                  Prevzamem to izmeno
                </button>
              </ActionForm>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Moje menjave</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Nič oddanega ali prevzetega.</p>
        ) : (
          mine.map((offer) => (
            <article key={offer.id} className="card">
              <div className="flex items-baseline justify-between gap-2">
                <ShiftLine shift={offer.shift} />
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(
                    offer.status,
                  )}`}
                >
                  {STATUS_LABELS[offer.status] ?? offer.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {offer.offeredById === user.id ? "Oddal/a si jo ti" : "Prevzel/a si jo ti"}
                {offer.claimedBy && offer.offeredById === user.id
                  ? ` · prevzel/a ${offer.claimedBy.firstName} ${offer.claimedBy.lastName}`
                  : ""}
              </p>

              {offer.offeredById === user.id && offer.status !== "approved" ? (
                <ActionForm
                  action={cancelOfferAction}
                  className="mt-2"
                  confirm="Prekličem ponudbo in obdržim izmeno?"
                >
                  <input type="hidden" name="id" value={offer.id} />
                  <button type="submit" className="btn-secondary w-full text-sm">
                    Prekliči ponudbo
                  </button>
                </ActionForm>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
