import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testi namenoma tečejo v UTC, gostitelji pa tudi. Če se v kodo prikrade
// odvisnost od časovnega pasu procesa (getHours, setHours, toLocaleTimeString
// brez timeZone), testi za čas lokala odpovejo — in prav to je namen.
process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
