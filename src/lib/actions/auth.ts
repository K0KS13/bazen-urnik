"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string };

/**
 * Preprosta zaščita pred ugibanjem PIN-a. Hrani se v pomnilniku procesa, kar
 * zadošča za en strežnik; ob ponovnem zagonu se števci ponastavijo.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

function registerFailure(employeeId: string): void {
  const now = Date.now();
  const current = attempts.get(employeeId);
  if (!current || now - current.firstAt > LOCKOUT_MS) {
    attempts.set(employeeId, { count: 1, firstAt: now });
    return;
  }
  current.count += 1;
}

function minutesUntilUnlock(employeeId: string): number {
  const current = attempts.get(employeeId);
  if (!current || current.count < MAX_ATTEMPTS) return 0;
  const remaining = LOCKOUT_MS - (Date.now() - current.firstAt);
  if (remaining <= 0) {
    attempts.delete(employeeId);
    return 0;
  }
  return Math.ceil(remaining / 60000);
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!employeeId) return { error: "Najprej izberi svoje ime." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN mora imeti 4 števke." };

  const locked = minutesUntilUnlock(employeeId);
  if (locked > 0) {
    return { error: `Preveč poskusov. Poskusi znova čez ${locked} min.` };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, pinHash: true, active: true },
  });

  if (!employee || !employee.active) {
    return { error: "Ta oseba ni več aktivna. Obrni se na vodstvo." };
  }

  if (!(await bcrypt.compare(pin, employee.pinHash))) {
    registerFailure(employee.id);
    return { error: "Napačen PIN." };
  }

  attempts.delete(employee.id);
  await createSession(employee.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/prijava");
}
