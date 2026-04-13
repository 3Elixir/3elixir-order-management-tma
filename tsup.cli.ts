import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  outDir: "dist/cli",
  format: ["esm"],
  target: "node20",
  platform: "node",
  banner: {
    js: [
      "#!/usr/bin/env node",
      // Shim require() for CJS dependencies (dotenv, qs, etc.) in ESM bundle
      'import { createRequire as __cr } from "module";',
      "const require = __cr(import.meta.url);",
    ].join("\n"),
  },
  // Prisma Client must remain external — it relies on a native binary
  // and __dirname references that can't be bundled into ESM.
  external: ["@prisma/client", ".prisma/client"],
  // Bundle everything else (tRPC, zod, dotenv, etc.) into one file
  noExternal: [/^(?!@prisma\/client|\.prisma\/client).*/],
  splitting: false,
  clean: true,
  sourcemap: false,
});
