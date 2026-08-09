import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migracije tečejo prek neposredne povezave (Supabase: vrata 5432).
    // Aplikacija sama uporablja DATABASE_URL prek pooler ja (vrata 6543),
    // ki za spreminjanje sheme ni primeren.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
