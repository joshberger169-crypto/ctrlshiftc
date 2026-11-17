import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**", "rules/clearurls.js"],
    env: { browser: true, node: true, webextensions: true },
    categories: { correctness: "error" },
  },
  fmt: { ignorePatterns: ["rules/**"] },
  build: {
    target: "chrome116",
    minify: true,
    rolldownOptions: {
      external: ["./rules/clearurls.js"],
      input: { background: "background.js", offscreen: "offscreen.js" },
      output: { entryFileNames: "[name].js" },
    },
  },
  plugins: [
    {
      name: "extension-files",
      generateBundle() {
        for (const name of [
          "clearurls.js",
          "NOTICE.txt",
          "LICENSE-LGPL-3.0.txt",
          "LICENSE-GPL-3.0.txt",
        ]) {
          this.emitFile({
            type: "asset",
            fileName: `rules/${name}`,
            source: readFileSync(`rules/${name}`, "utf8"),
          });
        }
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
