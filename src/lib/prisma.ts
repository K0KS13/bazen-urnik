import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  // Relativna `file:` pot se razreši glede na koren projekta (od koder teče
  // tako `next dev` kot Prisma CLI), zato je za oba ista datoteka.
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// V razvoju Next.js večkrat naloži modul (hot reload); brez tega bi ob vsakem
// nalaganju odprli novo povezavo na bazo.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
