import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Database tests (`pnpm test:db`): RLS and triggers against the DEV Supabase project with
 * throwaway users (D-043). Kept apart from `pnpm test`, which never touches the network.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
