import test from "node:test";
import assert from "node:assert/strict";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isSameOrigin, isGoogleIdentity } from "../src/lib/firebase/policy";
test("only verified Google identities can own a tracker", () => {
  const identity = {
    uid: "test-google-uid",
    email: "person@example.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" },
  } as DecodedIdToken;
  assert.equal(isGoogleIdentity(identity), true);
  for (const edit of [
    { email_verified: false },
    { uid: "" },
    { email: "" },
    { firebase: { sign_in_provider: "password" } },
  ])
    assert.equal(
      isGoogleIdentity({ ...identity, ...edit } as DecodedIdToken),
      false,
    );
});
test("login and logout reject absent, foreign, and cross-site origins", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://tracker.example/api/auth/session", { headers });
  assert.equal(
    isSameOrigin(
      request({
        origin: "https://tracker.example",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
  for (const headers of [
    {},
    { origin: "https://evil.example" },
    { origin: "null" },
    { origin: "https://tracker.example", "sec-fetch-site": "cross-site" },
  ] as Record<string, string>[])
    assert.equal(isSameOrigin(request(headers)), false);
});
