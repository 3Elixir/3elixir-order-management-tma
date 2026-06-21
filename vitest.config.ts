import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/cli/__tests__/setup.ts"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@server": path.resolve(__dirname, "./src/server"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@schema": path.resolve(__dirname, "./src/types"),
    },
  },
});
