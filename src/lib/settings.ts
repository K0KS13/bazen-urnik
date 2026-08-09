import "server-only";
import { prisma } from "@/lib/prisma";

/** Enovrstična tabela nastavitev; ob prvem dostopu jo ustvarimo s privzetki. */
export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}
