import test from "node:test";
import assert from "node:assert/strict";
import {
  isAuthRequest,
  isGoogleCredential,
  readAuthConfig,
  readAuthResult,
} from "../extension/protocol.ts";

const user = { uid: "google-test-user", email: null, displayName: null };

test("extension messages require a known action and a boolean token-refresh flag", () => {
  assert.equal(isAuthRequest({ type: "auth-token", forceRefresh: true }), true);
  assert.equal(isAuthRequest({ type: "auth-status" }), true);
  for (const value of [
    null,
    [],
    "auth-token",
    { type: "unknown" },
    { type: "auth-token", forceRefresh: "false" },
    { target: "offscreen", type: "auth-sign-in" },
  ])
    assert.equal(isAuthRequest(value), false);
});

test("extension responses reject malformed users and missing credentials", () => {
  assert.deepEqual(readAuthResult("auth-status", { user: null }), {
    user: null,
  });
  assert.deepEqual(
    readAuthResult("auth-token", { user, token: "test-token" }),
    {
      user,
      token: "test-token",
    },
  );
  for (const value of [
    null,
    {},
    { user: {} },
    { user: null },
    { user, token: 42 },
    { user, token: "" },
  ])
    assert.throws(() => readAuthResult("auth-token", value));
  assert.throws(() => readAuthResult("auth-sign-in", { user: null }));
  assert.throws(() => readAuthResult("auth-sign-out", { user }));
  assert.throws(
    () => readAuthResult("auth-status", { error: "Connection failed." }),
    /Connection failed/,
  );
  assert.equal(isGoogleCredential({ idToken: "test-google-token" }), true);
  assert.equal(
    isGoogleCredential({ accessToken: "test-access-token", idToken: null }),
    true,
  );
  for (const value of [
    null,
    {},
    { idToken: "" },
    { idToken: 42 },
    { idToken: "test-token", accessToken: {} },
  ])
    assert.equal(isGoogleCredential(value), false);
});

test("extension configuration requires complete public Firebase settings", () => {
  const config = {
    firebase: {
      apiKey: "public-test-key",
      authDomain: "test.firebaseapp.com",
      projectId: "demo-test",
      appId: "test-app-id",
    },
    extensionOrigins: ["chrome-extension://test-extension"],
  };
  assert.deepEqual(readAuthConfig(config), config);
  for (const value of [
    null,
    [],
    {},
    { ...config, firebase: {} },
    { ...config, extensionOrigins: [42] },
    { ...config, emulatorUrl: 9099 },
  ])
    assert.throws(() => readAuthConfig(value));
});
