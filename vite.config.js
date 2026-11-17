import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**"],
    env: { browser: true, node: true, webextensions: true },
    categories: { correctness: "error" },
  },
});
