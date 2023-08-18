import esbuild from "esbuild";
import path from "node:path";

import { argv } from "./argv.mjs";

(async () => {
  const browser = argv.b || argv.browser || false;
  const format = argv.f || argv.format || "esm";
  const suffix = argv.m || argv.minify ? ".min" : "";
  const outExtension = {
    ".js": `${suffix}${format === "cjs" ? ".cjs" : ".js"}`,
  };
  const serve = argv.s || argv.serve || false;

  const defaults = {
    bundle: true,
    entryPoints: ["./src/index.ts"],
    format,
    keepNames: true,
    metafile: false,
    minify: argv.m || argv.minify || false,
    outdir: "dist",
    outExtension,
    platform: format === "cjs" ? "node" : "browser",
    plugins: [],
  };

  if (serve) {
    console.log(`Starting development server...`);
    const context = await esbuild.context(defaults);

    context
      .serve({
        servedir: "dist",
      })
      .then((result) => {
        console.log(`Test server started: ${result.host}:${result.port}`);
      });
  } else {
    await esbuild.build(defaults);
    console.log(`${suffix ? "Minified" : ""} Package ${format} bundle created`);
  }
})();
