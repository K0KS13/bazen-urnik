import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testi tečejo v istem časovnem pasu kot strežnik (glej src/instrumentation.ts),
// sicer bi izidi za meje dneva, tedna in meseca odstopali od produkcije.
process.env.TZ ??= "Europe/Ljubljana";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
