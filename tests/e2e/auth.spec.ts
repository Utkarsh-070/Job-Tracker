import { test, expect } from "@playwright/test";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  fixtureAccounts,
  googleToken,
  login,
  emulatorOrigin,
  projectId,
} from "../support/firebase";

test("the Google sign-in button completes the site popup flow", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  const provider = context.waitForEvent("page", {
    predicate: (candidate) => candidate !== page,
  });
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  const google = await provider;
  await google.waitForLoadState();
  await google.getByText(fixtureAccounts.first.email, { exact: false }).click();
  await expect(page).toHaveURL("http://localhost:3037/", { timeout: 30000 });
  await expect(page.locator(".workspace-account")).toContainText(
    fixtureAccounts.first.email,
  );
});

test("Google sessions persist, reject login CSRF, and clear on logout", async ({
  page,
  request,
  context,
}) => {
  const token = await googleToken(request);
  expect(
    (
      await request.post("/api/auth/session", {
        data: { idToken: token },
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/session", {
        data: { idToken: token },
        headers: { Origin: "http://localhost:3037" },
      })
    ).status(),
  ).toBe(403);
  await login(page);
  await expect(page.locator(".workspace-account")).toContainText(
    fixtureAccounts.first.email,
  );
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "jt_session",
  );
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session!.expires - Date.now() / 1000).toBeGreaterThan(13 * 86400);
  await page.reload();
  await expect(page).toHaveURL("http://localhost:3037/");
  await page.goto("/login");
  await expect(page).toHaveURL("http://localhost:3037/");
  expect(
    (
      await page.request.post("/api/logout", {
        headers: { Origin: "https://evil.example" },
        maxRedirects: 0,
      })
    ).status(),
  ).toBe(403);
  await page
    .getByRole("button", { name: "Log out", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "jt_session"),
  ).toBeUndefined();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("invalid, expired, non-Google and disabled credentials cannot access records", async ({
  request,
  page,
}) => {
  const post = (token: string) =>
    request.post("/api/applications", {
      headers: { Authorization: "Bearer " + token },
      data: {},
    });
  for (const token of [
    "forged-token",
    "11111111-1111-4111-8111-111111111111",
    "first-test-workspace-access-key-32-characters",
  ])
    expect((await post(token)).status()).toBe(401);
  const password = await request.post(
    emulatorOrigin +
      "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key",
    {
      data: {
        email: "password-only@example.test",
        password: "a-long-local-password",
        returnSecureToken: true,
      },
    },
  );
  expect((await post((await password.json()).idToken)).status()).toBe(401);
  const token = await googleToken(request, "second");
  const parts = token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  payload.exp = Math.floor(Date.now() / 1000) - 3600;
  const expired =
    parts[0] +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url") +
    "." +
    parts[2];
  expect((await post(expired)).status()).toBe(401);
  await login(page, "second");
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  const app =
    getApps().find((item) => item.name === "auth-tests") ||
    initializeApp({ projectId }, "auth-tests");
  const admin = getAuth(app);
  await admin.updateUser(fixtureAccounts.second.uid, { disabled: true });
  try {
    expect((await post(token)).status()).toBe(401);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await admin.updateUser(fixtureAccounts.second.uid, { disabled: false });
  }
  const revocable = await googleToken(request, "second");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await admin.revokeRefreshTokens(fixtureAccounts.second.uid);
  expect((await post(revocable)).status()).toBe(401);
});
