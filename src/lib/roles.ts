export const ROLES = ["employee", "manager", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Zaposlen/a",
  manager: "Vodja izmene",
  admin: "Vodstvo",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Vodje izmen in vodstvo: urejanje urnika, popravki ur, izvoz. */
export function canManageSchedule(role: Role): boolean {
  return role === "manager" || role === "admin";
}

/** Samo vodstvo: dodajanje/brisanje zaposlenih in spreminjanje vlog. */
export function canManageEmployees(role: Role): boolean {
  return role === "admin";
}
