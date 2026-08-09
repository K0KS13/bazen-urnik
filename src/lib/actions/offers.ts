"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireScheduleManager, requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/actions/time";

function refreshViews(): void {
  revalidatePath("/urnik");
  revalidatePath("/menjave");
  revalidatePath("/");
}

/** Zaposleni ponudi svojo prihodnjo izmeno sodelavcem. */
export async function offerShiftAction(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { employeeId: true, start: true, offer: { select: { status: true } } },
  });

  if (!shift) return { error: "Izmene ni več." };
  if (shift.employeeId !== user.id) return { error: "To ni tvoja izmena." };
  if (shift.start < new Date()) return { error: "Izmena je že mimo." };
  if (shift.offer && shift.offer.status !== "cancelled" && shift.offer.status !== "rejected") {
    return { error: "Ta izmena je že oddana." };
  }

  // Zavrnjeno ali preklicano ponudbo lahko nadomestimo z novo.
  await prisma.shiftOffer.upsert({
    where: { shiftId },
    create: { shiftId, offeredById: user.id, note: note || null },
    update: {
      offeredById: user.id,
      note: note || null,
      status: "open",
      claimedById: null,
      claimedAt: null,
      decidedById: null,
      decidedAt: null,
    },
  });

  refreshViews();
  return { ok: "Izmena je ponujena sodelavcem." };
}

export async function cancelOfferAction(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const offer = await prisma.shiftOffer.findUnique({
    where: { id },
    select: { offeredById: true, status: true },
  });
  if (!offer) return { error: "Ponudbe ni več." };
  if (offer.offeredById !== user.id) return { error: "To ni tvoja ponudba." };
  if (offer.status === "approved") {
    return { error: "Menjava je že potrjena — obrni se na vodjo." };
  }

  await prisma.shiftOffer.update({
    where: { id },
    data: { status: "cancelled", claimedById: null, claimedAt: null },
  });

  refreshViews();
  return { ok: "Ponudba preklicana." };
}

/** Sodelavec prevzame ponujeno izmeno; dokončno potrdi vodja. */
export async function claimOfferAction(formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const offer = await prisma.shiftOffer.findUnique({
    where: { id },
    include: { shift: { select: { start: true, end: true, employeeId: true } } },
  });
  if (!offer) return { error: "Ponudbe ni več." };
  if (offer.status !== "open") return { error: "Ta izmena ni več na voljo." };
  if (offer.offeredById === user.id) return { error: "To je tvoja lastna izmena." };
  if (offer.shift.start < new Date()) return { error: "Izmena je že mimo." };

  const clash = await prisma.shift.findFirst({
    where: {
      employeeId: user.id,
      start: { lt: offer.shift.end },
      end: { gt: offer.shift.start },
    },
    select: { id: true },
  });
  if (clash) return { error: "V tem času že imaš svojo izmeno." };

  const absent = await prisma.absence.findFirst({
    where: {
      employeeId: user.id,
      status: "approved",
      startDate: { lt: offer.shift.end },
      endDate: { gte: new Date(offer.shift.start.toDateString()) },
    },
    select: { id: true },
  });
  if (absent) return { error: "V tem času imaš odobreno odsotnost." };

  await prisma.shiftOffer.update({
    where: { id },
    data: { status: "claimed", claimedById: user.id, claimedAt: new Date() },
  });

  refreshViews();
  return { ok: "Prevzeto. Čaka še potrditev vodje." };
}

/** Vodja potrdi menjavo (izmena se prepiše) ali jo zavrne. */
export async function decideOfferAction(formData: FormData): Promise<ActionState> {
  const manager = await requireScheduleManager();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Neveljavna odločitev." };
  }

  const offer = await prisma.shiftOffer.findUnique({
    where: { id },
    include: { shift: { select: { id: true, start: true, end: true } } },
  });
  if (!offer) return { error: "Ponudbe ni več." };
  if (offer.status !== "claimed" || !offer.claimedById) {
    return { error: "Te izmene še ni nihče prevzel." };
  }
  // Vodja izmene ne potrjuje menjave, v kateri je sam udeležen.
  const involved =
    offer.offeredById === manager.id || offer.claimedById === manager.id;
  if (involved && manager.role !== "admin") {
    return { error: "Menjave, v kateri si udeležen/a, ne moreš potrditi sam/a." };
  }

  if (decision === "rejected") {
    await prisma.shiftOffer.update({
      where: { id },
      data: {
        status: "rejected",
        decidedById: manager.id,
        decidedAt: new Date(),
      },
    });
    refreshViews();
    return { ok: "Menjava zavrnjena." };
  }

  const claimedById = offer.claimedById;

  // Prepis izmene in zaključek ponudbe morata uspeti skupaj, sicer bi izmena
  // ostala brez lastnika ali podvojena.
  await prisma.$transaction([
    prisma.shift.update({
      where: { id: offer.shift.id },
      data: { employeeId: claimedById },
    }),
    prisma.shiftOffer.update({
      where: { id },
      data: {
        status: "approved",
        decidedById: manager.id,
        decidedAt: new Date(),
      },
    }),
  ]);

  refreshViews();
  return { ok: "Menjava potrjena — izmena je prepisana." };
}
