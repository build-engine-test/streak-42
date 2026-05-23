import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  // tsconfig.json sets `jsx: preserve` (Next handles JSX in production), so
  // we tell esbuild — which Vitest uses for in-process transforms — to apply
  // the automatic JSX runtime here. Without this, `.tsx` files would need
  // an explicit `import React` to satisfy the classic transform, which is
  // not the convention used by the rest of the codebase.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
