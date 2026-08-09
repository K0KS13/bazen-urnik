import type { Role } from "@/lib/roles";

/**
 * Vodja izmene ne odloča o vlogah, v katerih je sam udeležen — vodstvo pa o
 * vseh. Ti dve funkciji vrneta pogoj za poizvedbo, da se takšne vloge nikjer
 * ne pokažejo med čakajočimi; enako pravilo je uveljavljeno tudi v akcijah
 * (src/lib/actions/absences.ts, src/lib/actions/offers.ts).
 */
export function absencesToDecideBy(userId: string, role: Role) {
  return role === "admin" ? {} : { employeeId: { not: userId } };
}

export function offersToDecideBy(userId: string, role: Role) {
  return role === "admin"
    ? {}
    : { offeredById: { not: userId }, claimedById: { not: userId } };
}
