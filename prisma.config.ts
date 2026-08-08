import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Relativna `file:` pot je relativna glede na koren projekta.
    url: process.env["DATABASE_URL"],
  },
});
