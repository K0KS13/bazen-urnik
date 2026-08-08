/**
 * Ustvari prvi račun vodstva, če je baza še prazna.
 * Zaženi z: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.log(`V bazi je že ${existing} zaposlenih — ne spreminjam ničesar.`);
    return;
  }

  const pin = process.env.SEED_ADMIN_PIN ?? "2468";

  const admin = await prisma.employee.create({
    data: {
      firstName: "Jaka",
      lastName: "(vodstvo)",
      role: "admin",
      pinHash: await bcrypt.hash(pin, 10),
    },
  });

  console.log(`Ustvarjen račun vodstva: ${admin.firstName} ${admin.lastName}`);
  console.log(`PIN za prvo prijavo: ${pin}`);
  console.log("Po prijavi ga spremeni na začetni strani (»Spremeni svoj PIN«).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
