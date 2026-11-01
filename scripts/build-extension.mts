import { build, type Loader, type Plugin } from "esbuild";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const manifest: { key: string } = JSON.parse(
  await readFile("extension/manifest.json", "utf8"),
);
const extensionId = [
  ...createHash("sha256")
    .update(Buffer.from(manifest.key, "base64"))
    .digest("hex")
    .slice(0, 32),
]
  .map((hexDigit) => String.fromCharCode(97 + parseInt(hexDigit, 16)))
  .join("");

// Node resolution also works inside restricted Windows environments.
const localPackageResolver: Plugin = {
  name: "local-package-resolver",
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => ({
      path:
        args.kind === "entry-point"
          ? path.resolve(args.path)
          : createRequire(args.importer).resolve(args.path),
      namespace: "local-package",
    }));
    builder.onLoad(
      { filter: /.*/, namespace: "local-package" },
      async (args) => {
        const extension = path.extname(args.path);
        const loader: Loader =
          extension === ".json"
            ? "json"
            : extension === ".ts" || extension === ".mts"
              ? "ts"
              : "js";
        return {
          contents: await readFile(args.path, "utf8"),
          loader,
          resolveDir: path.dirname(args.path),
        };
      },
    );
  },
};

await build({
  absWorkingDir: process.cwd(),
  tsconfigRaw: {},
  entryPoints: {
    background: path.resolve("extension/auth/background.ts"),
    popup: path.resolve("extension/popup.ts"),
    offscreen: path.resolve("extension/offscreen.ts"),
  },
  outdir: path.resolve("extension/dist"),
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "chrome116",
  legalComments: "eof",
  plugins: [localPackageResolver],
});
console.log("Extension built from TypeScript. Stable ID: " + extensionId);
