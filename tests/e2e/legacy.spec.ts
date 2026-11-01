import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import {
  emulatorOrigin,
  fakeGoogleToken,
  fixtureAccounts,
  projectId,
} from "../support/firebase";

const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54331/postgres";

function claim(userId: string, uid: string) {
  return spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "prisma/claim-legacy.ts",
      "--user-id",
      userId,
      "--firebase-uid",
      uid,
    ],
    {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
        FIREBASE_PROJECT_ID: projectId,
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIREBASE_CLIENT_EMAIL: "",
        FIREBASE_PRIVATE_KEY: "",
        GOOGLE_APPLICATION_CREDENTIALS: "",
      },
    },
  );
}

test("legacy migration preserves jobs, refuses another owner, and leaves unowned records alone", async ({
  request,
}) => {
  let db = new Client({ connectionString: databaseUrl });
  await db.connect();
  async function claimWorkspace(userId: string, uid: string) {
    // Release the assertion connection while the CLI performs its transaction.
    await db.end();
    const result = claim(userId, uid);
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
    return result;
  }
  const legacyId = randomUUID();
  const directId = randomUUID();
  const ownedJob = randomUUID();
  const unownedJob = randomUUID();
  try {
    await db.query('INSERT INTO "User" (id, key) VALUES ($1,$2),($3,$4)', [
      legacyId,
      "legacy-" + legacyId,
      directId,
      "legacy-" + directId,
    ]);
    await db.query(
      'INSERT INTO "Application" (id, company, role, "appliedAt", "updatedAt", "userId") VALUES ($1,$2,$3,NOW(),NOW(),$4),($5,$6,$3,NOW(),NOW(),NULL)',
      [ownedJob, "Legacy company", "Engineer", legacyId, unownedJob, "Unowned"],
    );
    const target = await db.query(
      'SELECT id FROM "User" WHERE "firebaseUid"=$1',
      [fixtureAccounts.first.uid],
    );
    const moved = await claimWorkspace(legacyId, fixtureAccounts.first.uid);
    expect(moved.status, moved.stderr + moved.stdout).toBe(0);
    const jobs = await db.query(
      'SELECT id, "userId" FROM "Application" WHERE id=$1 OR id=$2',
      [ownedJob, unownedJob],
    );
    expect(jobs.rows.find((job) => job.id === ownedJob).userId).toBe(
      target.rows[0].id,
    );
    expect(jobs.rows.find((job) => job.id === unownedJob).userId).toBeNull();
    const retired = await db.query('SELECT key FROM "User" WHERE id=$1', [
      legacyId,
    ]);
    expect(retired.rows[0].key).toBeNull();

    const refused = await claimWorkspace(
      target.rows[0].id,
      fixtureAccounts.second.uid,
    );
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("different Google account");
    const unchanged = await db.query(
      'SELECT "userId" FROM "Application" WHERE id=$1',
      [ownedJob],
    );
    expect(unchanged.rows[0].userId).toBe(target.rows[0].id);

    // This Google identity exists in Firebase before it has a database workspace.
    const freshAccount = {
      sub: "legacy-" + directId,
      email: directId + "@example.test",
      name: "Migrated Friend",
    };
    const signedIn = await request.post(
      emulatorOrigin +
        "/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key",
      {
        data: {
          requestUri: "http://localhost:3037",
          returnSecureToken: true,
          postBody:
            "providerId=google.com&id_token=" +
            encodeURIComponent(fakeGoogleToken(freshAccount)),
        },
      },
    );
    expect(signedIn.ok()).toBeTruthy();
    const uid = (await signedIn.json()).localId as string;
    const linked = await claimWorkspace(directId, uid);
    expect(linked.status, linked.stderr + linked.stdout).toBe(0);
    const direct = await db.query(
      'SELECT key, "firebaseUid", email FROM "User" WHERE id=$1',
      [directId],
    );
    expect(direct.rows[0]).toMatchObject({
      key: null,
      firebaseUid: uid,
      email: freshAccount.email,
    });
  } finally {
    await db.query('DELETE FROM "Application" WHERE id=$1 OR id=$2', [
      ownedJob,
      unownedJob,
    ]);
    await db.query('DELETE FROM "User" WHERE id=$1 OR id=$2', [
      legacyId,
      directId,
    ]);
    await db.end();
  }
});
