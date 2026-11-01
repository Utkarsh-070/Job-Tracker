import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fixtureAccounts, emulatorOrigin } from "./firebase";
async function main() {
  const require = createRequire(import.meta.url);
  let emulatorCli = process.env.FIREBASE_TOOLS_CLI;
  if (!emulatorCli) {
    try {
      emulatorCli = require.resolve("firebase-tools/lib/bin/firebase.js");
    } catch {
      // Use the pinned npx CLI below when no local installation exists.
    }
  }
  const emulatorArgs = [
    "emulators:start",
    "--only",
    "auth",
    "--project",
    "demo-job-tracker",
    "--config",
    "tests/firebase.json",
  ];
  const emulator = emulatorCli
    ? spawn(process.execPath, [emulatorCli, ...emulatorArgs], {
        stdio: "inherit",
        env: {
          ...process.env,
          CI: "true",
          FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
        },
      })
    : spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        [
          "--yes",
          "--package=firebase-tools@15.32.1",
          "firebase",
          ...emulatorArgs,
        ],
        {
          stdio: "inherit",
          shell: process.platform === "win32",
          env: {
            ...process.env,
            CI: "true",
            FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
          },
        },
      );
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const check = await fetch(emulatorOrigin + "/");
      if (check.ok) {
        ready = true;
        break;
      }
    } catch {
      // Retry while the emulator starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) {
    emulator.kill();
    throw new Error("The Firebase Auth emulator did not start.");
  }
  const imported = await fetch(
    emulatorOrigin +
      "/identitytoolkit.googleapis.com/v1/projects/demo-job-tracker/accounts:batchCreate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        users: Object.values(fixtureAccounts).map((account) => ({
          localId: account.uid,
          email: account.email,
          emailVerified: true,
          displayName: account.name,
          providerUserInfo: [
            {
              providerId: "google.com",
              rawId: account.sub,
              email: account.email,
              displayName: account.name,
            },
          ],
        })),
      }),
    },
  );
  if (!imported.ok)
    throw new Error(
      "Test accounts could not be imported: " + (await imported.text()),
    );
  const database = await PGlite.create();
  const migrationRoot = path.resolve("prisma/migrations");
  for (const directory of (
    await readdir(migrationRoot, { withFileTypes: true })
  )
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    await database.exec(
      await readFile(
        path.join(migrationRoot, directory.name, "migration.sql"),
        "utf8",
      ),
    );
  await database.query(
    'INSERT INTO "User" ("id","key","firebaseUid") VALUES ($1,$2,$3),($4,$5,$6)',
    [
      "11111111-1111-4111-8111-111111111111",
      "first-test-workspace-access-key-32-characters",
      fixtureAccounts.first.uid,
      "22222222-2222-4222-8222-222222222222",
      "second-test-workspace-access-key-32-characters",
      fixtureAccounts.second.uid,
    ],
  );
  const socket = new PGLiteSocketServer({
    db: database,
    port: 54331,
    host: "127.0.0.1",
    // The site, assertions, and migration CLI use separate database connections.
    maxConnections: 10,
  });
  await socket.start();
  const extensionRoot = path.resolve("extension");
  const staticServer = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(
        new URL(request.url || "/", "http://127.0.0.1").pathname,
      );
      const file = path.resolve(extensionRoot, "." + requestPath);
      if (!file.startsWith(extensionRoot + path.sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
      const content = await readFile(file);
      const mime = file.endsWith(".html")
        ? "text/html"
        : file.endsWith(".css")
          ? "text/css"
          : /\.(js|mjs)$/.test(file)
            ? "text/javascript"
            : file.endsWith(".woff2")
              ? "font/woff2"
              : file.endsWith(".svg")
                ? "image/svg+xml"
                : "image/png";
      response.writeHead(200, { "Content-Type": mime });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((resolve) =>
    staticServer.listen(4047, "127.0.0.1", resolve),
  );
  const manifest = JSON.parse(
    await readFile(path.join(extensionRoot, "manifest.json"), "utf8"),
  );
  const extensionId = [
    ...createHash("sha256")
      .update(Buffer.from(manifest.key, "base64"))
      .digest("hex")
      .slice(0, 32),
  ]
    .map((n) => String.fromCharCode(97 + parseInt(n, 16)))
    .join("");
  const child = spawn(
    process.execPath,
    [
      path.resolve("node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--experimental-next-config-strip-types",
      "-p",
      "3037",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54331/postgres",
        DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54331/postgres",
        FIREBASE_PROJECT_ID: "demo-job-tracker",
        FIREBASE_API_KEY: "fake-api-key",
        FIREBASE_AUTH_DOMAIN: "demo-job-tracker.firebaseapp.com",
        FIREBASE_APP_ID: "1:123456:web:test",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIREBASE_EXTENSION_IDS: extensionId,
        FIREBASE_CLIENT_EMAIL: "",
        FIREBASE_PRIVATE_KEY: "",
        APP_URL: "http://localhost:3037",
        OPENAI_API_KEY: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  let stopping = false;
  async function cleanup() {
    if (stopping) return;
    stopping = true;
    if (process.platform === "win32" && child.pid)
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else child.kill();
    emulator.kill();
    staticServer.close();
    await socket.stop();
    await database.close();
    process.exit(0);
  }
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  child.on("exit", cleanup);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
