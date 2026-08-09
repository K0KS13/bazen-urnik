"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string };

/**
 * Zaščita pred ugibanjem PIN-a.
 *
 * Števci so v bazi, ne v pomnilniku procesa: na gostitelju se strežnik pogosto
 * zažene na novo in teče v več hkratnih instancah, zato bi se pomnilniški
 * števci ponastavili in zaklep ne bi držal. Pri 4-mestnem PIN-u je to edina
 * ovira med naključnim obiskovalcem in tujim računom.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

type LockState = {
  failedLoginCount: number;
  failedLoginSince: Date | null;
};

/** Koliko minut je še do sprostitve; 0 pomeni, da račun ni zaklenjen. */
function minutesUntilUnlock(state: LockState, now: Date): number {
  if (state.failedLoginCount < MAX_ATTEMPTS || !state.failedLoginSince) return 0;

  const elapsed = now.getTime() - state.failedLoginSince.getTime();
  const remaining = LOCKOUT_MINUTES * 60000 - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!employeeId) return { error: "Najprej izberi svoje ime." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN mora imeti 4 števke." };

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      pinHash: true,
      active: true,
      failedLoginCount: true,
      failedLoginSince: true,
    },
  });

  if (!employee || !employee.active) {
    return { error: "Ta oseba ni več aktivna. Obrni se na vodstvo." };
  }

  const now = new Date();
  const locked = minutesUntilUnlock(employee, now);
  if (locked > 0) {
    return { error: `Preveč poskusov. Poskusi znova čez ${locked} min.` };
  }

  // Okno je poteklo, a števec je še vpisan — štetje začnemo znova.
  const windowExpired =
    employee.failedLoginSince !== null &&
    now.getTime() - employee.failedLoginSince.getTime() >
      LOCKOUT_MINUTES * 60000;

  if (!(await bcrypt.compare(pin, employee.pinHash))) {
    await prisma.employee.update({
      where: { id: employee.id },
      data:
        windowExpired || employee.failedLoginCount === 0
          ? { failedLoginCount: 1, failedLoginSince: now }
          : { failedLoginCount: { increment: 1 } },
    });
    return { error: "Napačen PIN." };
  }

  if (employee.failedLoginCount > 0) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { failedLoginCount: 0, failedLoginSince: null },
    });
  }

  await createSession(employee.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/prijava");
}
