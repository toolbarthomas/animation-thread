import esbuild from "esbuild";
import path from "node:path";

import { argv } from "./argv.mjs";

(async () => {
  const suffix = argv.m || argv.minify ? ".legacy.min" : ".legacy";

  const defaults = {
    bundle: true,
    entryPoints: ["./src/index.legacy.ts"],
    keepNames: true,
    metafile: false,
    minify: argv.m || argv.minify || false,
    outdir: "dist",
    outExtension: {
      ".js": `${suffix}.js`,
    },
    platform: "browser",
    plugins: [],
  };

  await esbuild.build(defaults);
  console.log(`${suffix ? "Minified" : ""} Legacy bundle created`);
})();
