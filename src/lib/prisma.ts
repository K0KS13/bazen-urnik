import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Manjka spremenljivka okolja DATABASE_URL (glej .env.example).");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// V razvoju Next.js večkrat naloži modul (hot reload); brez tega bi ob vsakem
// nalaganju odprli nov nabor povezav na bazo.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
