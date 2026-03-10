import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    "openai",
    "@anthropic-ai/sdk",
    "better-sqlite3",
    "@supabase/supabase-js",
  ],
});
