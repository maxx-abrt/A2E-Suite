import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"], include: ["tests/**/*.test.{ts,tsx}"], testTimeout: 20000, css: { include: /.+/ }, server: { deps: { inline: [/blocknote/, /katex/, /@reduxjs\/toolkit/] } } },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
