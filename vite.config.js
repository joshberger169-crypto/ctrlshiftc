import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**"],
    env: { browser: true, node: true, webextensions: true },
    categories: { correctness: "error" },
  },
  build: {
    target: "chrome116",
    minify: true,
    rolldownOptions: {
      input: { background: "background.js", offscreen: "offscreen.js" },
      output: { entryFileNames: "[name].js" },
    },
  },
  plugins: [
    {
      name: "extension-files",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: JSON.stringify(JSON.parse(readFileSync("manifest.json", "utf8"))),
        });
        this.emitFile({
          type: "asset",
          fileName: "offscreen.html",
          source:
            '<!doctype html><meta charset="utf-8"><textarea id="clipboard"></textarea><script src="offscreen.js"></script>',
        });
      },
    },
  ],
});
