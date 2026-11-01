import { type APIRequestContext, type Page } from "@playwright/test";
export const emulatorOrigin = "http://127.0.0.1:9099";
export const projectId = "demo-job-tracker";
export const fixtureAccounts = {
  first: {
    uid: "google-first-user",
    sub: "google-first-sub",
    email: "first@example.test",
    name: "First Friend",
  },
  second: {
    uid: "google-second-user",
    sub: "google-second-sub",
    email: "second@example.test",
    name: "Second Friend",
  },
};
export function fakeGoogleToken(
  account: { sub: string; email: string; name: string },
  authTime = Math.floor(Date.now() / 1000),
) {
  const encode = (data: object) =>
    Buffer.from(JSON.stringify(data)).toString("base64url");
  // Emulator-only upstream Google credential. Production Firebase rejects this unsigned fixture.
  return (
    encode({ alg: "none", typ: "JWT" }) +
    "." +
    encode({
      iss: "https://accounts.google.com",
      aud: "demo-client",
      sub: account.sub,
      email: account.email,
      email_verified: true,
      name: account.name,
      iat: authTime,
      exp: authTime + 3600,
    }) +
    "."
  );
}
export async function googleToken(
  request: APIRequestContext,
  account: keyof typeof fixtureAccounts = "first",
) {
  const response = await request.post(
    emulatorOrigin +
      "/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key",
    {
      data: {
        requestUri: "http://localhost:3037",
        returnSecureToken: true,
        postBody:
          "providerId=google.com&id_token=" +
          encodeURIComponent(fakeGoogleToken(fixtureAccounts[account])),
      },
    },
  );
  if (!response.ok())
    throw new Error("Emulator sign-in failed: " + (await response.text()));
  return (await response.json()).idToken as string;
}
export async function login(
  page: Page,
  account: keyof typeof fixtureAccounts = "first",
) {
  await page.goto("/login");
  const idToken = await googleToken(page.request, account);
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrf.json();
  const session = await page.request.post("/api/auth/session", {
    headers: { Origin: "http://localhost:3037" },
    data: { idToken, csrfToken },
  });
  if (!session.ok())
    throw new Error("Session creation failed: " + (await session.text()));
  await page.goto("/");
}
