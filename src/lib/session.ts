import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageEmployees, canManageSchedule, isRole, type Role } from "@/lib/roles";

const COOKIE_NAME = "bazen_seja";
/** Seja traja eno dolgo izmeno; po tem je potrebna ponovna prijava s PIN-om. */
const SESSION_HOURS = 12;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("Manjka spremenljivka okolja AUTH_SECRET (glej .env.example).");
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
};

export async function createSession(employeeId: string): Promise<void> {
  const token = await new SignJWT({ sub: employeeId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Trenutno prijavljeni zaposleni, ali null. Preveri tudi, da je račun še aktiven. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let employeeId: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    employeeId = payload.sub;
  } catch {
    return null;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, role: true, active: true },
  });

  if (!employee || !employee.active || !isRole(employee.role)) return null;

  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    role: employee.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/prijava");
  return user;
}

export async function requireScheduleManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageSchedule(user.role)) redirect("/");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) redirect("/");
  return user;
}
