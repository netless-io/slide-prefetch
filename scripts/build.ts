import cp from "child_process";
import esbuild, { BuildOptions } from "esbuild";
import { externalGlobalPlugin } from "esbuild-plugin-external-global";
import pkg from "../package.json";

function system(cmd: string) {
  const child = cp.spawn(cmd, { stdio: "inherit", shell: true });
  return new Promise((resolve) => child.on("close", resolve));
}

function rollupDTS(src: string, dist: string) {
  return system(`npx rollup ${src} -p dts -o ${dist}`);
}

const sharedConfig: BuildOptions = {
  allowOverwrite: true,
  sourcemap: true,
  bundle: true,
  external: Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...{ electron: true },
  }),
  logLevel: "info",
};

function esbuildESM(src: string, dist: string, isNode = false) {
  return esbuild.build({
    ...sharedConfig,
    entryPoints: [src],
    outfile: dist,
    format: "esm",
    ...(isNode && { platform: "node" }),
  });
}

function esbuildCJS(src: string, dist: string, isNode = false) {
  return esbuild.build({
    ...sharedConfig,
    entryPoints: [src],
    outfile: dist,
    format: "cjs",
    ...(isNode && { platform: "node" }),
  });
}

function esbuildIIFE(src: string, distMIN: string) {
  const dist = distMIN.replace(/\.min\.js$/, ".js");
  const options: BuildOptions = {
    ...sharedConfig,
    entryPoints: [src],
    outfile: dist,
    target: "es6",
    plugins: [
      externalGlobalPlugin({
        "@zip.js/zip.js": "window.zip",
      }),
    ],
    globalName: "slide_prefetch",
  };
  return Promise.all([
    esbuild.build(options),
    esbuild.build({
      ...options,
      minify: true,
      outfile: distMIN,
    }),
  ]);
}

const buildTypes = process.argv.includes("--skip-types")
  ? Promise.resolve()
  : Promise.all([
      rollupDTS("src/index.ts", pkg.types),
      rollupDTS("src/electron/main.ts", "dist/electron.d.ts"),
    ]);

Promise.all([
  buildTypes as Promise<unknown>,
  esbuildESM("src/index.ts", pkg.module),
  esbuildCJS("src/index.ts", pkg.main),
  esbuildIIFE("src/index.ts", pkg.jsdelivr),
  esbuildESM("src/electron/main.ts", "dist/electron.mjs", true),
  esbuildCJS("src/electron/main.ts", "dist/electron.js", true),
]);
